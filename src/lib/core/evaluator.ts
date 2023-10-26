import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import yaml from 'js-yaml';
import z from 'zod';
import {generateErrorMessage, ErrorMessageOptions} from 'zod-error';

import {Stage} from '../core';
import {Configuration, filesFromFolder} from '../shared';

export async function evaluateTestCases<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
>(configuration: Configuration, stages: T) {
  const validator = z.object({
    tags: z.array(z.string()).optional(),
    sha: z.string(),
    input: stages[0].types().input,
    expected: z.tuple(
      stages.map(s => s.types().output) as [z.ZodTypeAny, ...z.ZodTypeAny[]]
    ),
  });

  // Walk input folder getting test case files.
  const files = await filesFromFolder(configuration.inputFolder);

  // Load, hash, parse, and validate each test case.
  const promises = files.map(f => readFile(f));
  const buffers = await Promise.all(promises);
  const testCases = buffers.map((buffer, i) => {
    const sha = createHash('sha256').update(buffer).digest('hex');
    const obj = yaml.load(buffer.toString('utf-8'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).sha = sha;
    const result = validator.safeParse(obj);
    if (result.success) {
      return result.data;
    } else {
      const zodError = generateErrorMessage(result.error.issues);
      const errorMessage = `In ${files[i]}: ${zodError}`;
      throw new Error(errorMessage);
    }
  });

  // Filter test cases.

  // TEMPORARY: Print out test cases.
  for (const testCase of testCases) {
    console.log(JSON.stringify(testCase, null, 2));
  }
  // For each case, evaluate and add results to list.
  // Serialize list to disk.
}
