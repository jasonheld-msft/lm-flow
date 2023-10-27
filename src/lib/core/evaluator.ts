import yaml from 'js-yaml';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'path';
import pLimit from 'p-limit';
import z from 'zod';
import {generateErrorMessage, ErrorMessageOptions} from 'zod-error';

import {Application, IAvailableModels, Stage, TestCase} from '../core/index.js';
import {Configuration, filesFromFolder} from '../shared/index.js';

export async function evaluateTestCases<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
>(configuration: Configuration, models: IAvailableModels, stages: T) {
  const limit = pLimit(configuration.concurrancy);

  const validator = z.object({
    path: z.string(),
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
    const relativeFileName = path.posix.relative(
      configuration.inputFolder,
      files[i]
    );
    const parts = path.posix.parse(relativeFileName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).path = path.posix.join(parts.dir, parts.name);
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

  // // TEMPORARY: Print out test cases.
  // for (const testCase of filteredTestCases) {
  //   console.log(JSON.stringify(testCase, null, 2));
  // }

  const application = new Application(stages);

  // // Evaluate test cases.
  // const logs = await Promise.all(
  //   filteredTestCases.map(testCase =>
  //     limit(() => {
  //       const {sha} = testCase;
  //       const stageLogs = application.eval(models, testCase);
  //       return {sha, stageLogs};
  //     })
  //   )
  // );
  // Evaluate test cases.
  const logs = await Promise.all(
    filteredTestCases.map(testCase =>
      limit(() => application.eval(models, testCase))
    )
  );

  const results = logs.map((log, i) => {
    const {path, sha} = filteredTestCases[i];
    return {path, sha, log};
  });

  // TEMPORARY: Print out test cases.
  for (const result of results) {
    console.log(JSON.stringify(result, null, 2));
  }

  // Serialize list to disk.
}
