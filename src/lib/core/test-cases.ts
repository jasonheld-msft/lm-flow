import yaml from 'js-yaml';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'path';
import pLimit from 'p-limit';
import z from 'zod';
import {generateErrorMessage, ErrorMessageOptions} from 'zod-error';

import {filesFromFolder} from '../shared/index.js';

import {Configuration} from './configure.js';
import {AnyLink, TestCase} from './link7.js';

export async function loadTestCases<INPUT, OUTPUT>(
  configuration: Configuration,
  // The ensemble parameter is only used for type inference.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ensemble: AnyLink<INPUT, OUTPUT>
): Promise<TestCase<AnyLink<INPUT, OUTPUT>>[]> {
  // const logger = configuration.logger;
  const limit = pLimit(configuration.concurrancy);

  // TODO: restore schema validation
  // const validator = z.object({
  //   test_case_id: z.string(),
  //   sha: z.string(),
  //   tags: z.array(z.string()).optional(),
  //   input: stages[0].types().input,
  //   expected: z.tuple(
  //     stages.map(s => s.types().output) as [z.ZodTypeAny, ...z.ZodTypeAny[]]
  //   ),
  // });

  // Walk input folder getting test case files.
  const files = await filesFromFolder(configuration.inputFolder);

  // Load, hash, parse, and validate each test case.
  const promises = files.map(f => limit(readFile, f));
  const buffers = await Promise.all(promises);
  const testCases = buffers.map((buffer, i) => {
    const sha = createHash('sha256').update(buffer).digest('hex');
    const obj = yaml.load(buffer.toString('utf-8'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('sha' in (obj as any)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`Found SHA in test case: (sha = ${(obj as any).sha})`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).sha = sha;

    const relativeFileName = path.relative(configuration.inputFolder, files[i]);
    const parts = path.parse(relativeFileName);
    // DESIGN NOTE: use path.posix for text_case_id
    // to get consistent naming across operating systems.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('testCaseId' in (obj as any)) {
      throw new Error(
        `Found testCaseId in test case: (testCaseId = ${
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (obj as any).testCaseId
        })`
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).testCaseId = path.posix.join(parts.dir, parts.name);
    // TODO: restore schema validation
    // const result = validator.safeParse(obj);
    const result = {
      success: true,
      data: obj as TestCase<AnyLink<INPUT, OUTPUT>>,
      error: {issues: []},
    };
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
      return result.data; // as unknown as TestCase<T>;
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

  return filteredTestCases;
}
