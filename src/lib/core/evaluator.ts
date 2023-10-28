import fs from 'fs-extra';
import yaml from 'js-yaml';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'path';
import pLimit from 'p-limit';
import z from 'zod';
import {generateErrorMessage, ErrorMessageOptions} from 'zod-error';

import {Application, Configuration, Stage, TestCase} from '../core/index.js';
import {filesFromFolder} from '../shared/index.js';

export async function evaluateTestCases<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
>(configuration: Configuration, stages: T) {
  const logger = configuration.logger;
  const limit = pLimit(configuration.concurrancy);

  const validator = z.object({
    test_case_id: z.string(),
    sha: z.string(),
    tags: z.array(z.string()).optional(),
    input: stages[0].types().input,
    expected: z.tuple(
      stages.map(s => s.types().output) as [z.ZodTypeAny, ...z.ZodTypeAny[]]
    ),
  });

  // Walk input folder getting test case files.
  const files = await filesFromFolder(configuration.inputFolder);

  // Load, hash, parse, and validate each test case.
  const promises = files.map(f => limit(readFile, f));
  const buffers = await Promise.all(promises);
  const testCases = buffers.map((buffer, i) => {
    const sha = createHash('sha256').update(buffer).digest('hex');
    const obj = yaml.load(buffer.toString('utf-8'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).sha = sha;
    const relativeFileName = path.relative(configuration.inputFolder, files[i]);
    const parts = path.parse(relativeFileName);
    // DESIGN NOTE: use path.posix for text_case_id
    // to get consistent naming across operating systems.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).test_case_id = path.posix.join(parts.dir, parts.name);
    const result = validator.safeParse(obj);
    if (result.success) {
      // WARNING: this type assertion is dangerous.
      // TODO: REVIEW: asserting as TestCase<T> because the type of
      // result.data is
      // {
      //   expected: [any, ...any[]];
      //   sha: string;
      //   tags?: string[] | undefined;
      //   input?: any;
      // }
      // I suspect that `input` is optional because it's zod type
      // is ZodTypeAny. I have so far been unable to make ZodTypeAny
      // specify a required property. It is interesting to note that
      // the `expected` field works correctly.
      return result.data as unknown as TestCase<T>;
    } else {
      const zodError = generateErrorMessage(result.error.issues);
      const errorMessage = `In ${files[i]}: ${zodError}`;
      throw new Error(errorMessage);
    }
  });

  // Filter test cases.
  const filteredTestCases = testCases.filter(c =>
    configuration.filter(c.tags || [])
  );

  const application = new Application(stages);

  // Evaluate test cases.
  const logs = await Promise.all(
    filteredTestCases.map(testCase =>
      limit(() => application.eval(configuration.models, testCase))
    )
  );

  const cases = logs.map((log, i) => {
    const {test_case_id, sha} = filteredTestCases[i];
    return {test_case_id, sha, log};
  });

  const {cmd, cwd, test_run_id, user} = configuration;
  const timestamp = configuration.timestamp;
  const models = [...configuration.models.models()].map(m => m.spec());
  const runLog = {test_run_id, cmd, cwd, timestamp, user, models, cases};

  // Serialize run log to disk.
  const text = yaml.dump(runLog);
  // console.log(text);

  const outfile = makeFilename(configuration);
  if (configuration.dryrun) {
    logger.info(`Ready to save run log to "${outfile}".`, 1);
  } else {
    logger.info(`Saving run log to "${outfile}".`, 1);
    await fs.ensureFile(outfile);
    fs.writeFile(outfile, text, {encoding: 'utf8'});
  }
  logger.info('finished', 1);
}

function makeFilename({logFile, outputFolder, test_run_id}: Configuration) {
  const filename = logFile || test_run_id + '.yaml';

  // WARNING: do not use path.posix() here. Required for resolve to work correctly
  // on Windows with absolute paths.
  const filepath = path.resolve(outputFolder, filename);
  return filepath;
}
