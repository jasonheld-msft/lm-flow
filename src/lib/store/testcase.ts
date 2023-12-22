import yaml from 'js-yaml';
import {z} from 'zod';

import {FileFormat} from './types.js';

export const zodStoreTestCase = z.object({
  uuid: z.string().uuid(),
  // sha: z.string(),
  tags: z.array(z.string()).optional(),
  input: z.string(),
  expected: z.string(),
  context: z.any(),
  score: z.number().optional(),
  comment: z.string().optional(),
});
export type StoreTestCase = z.infer<typeof zodStoreTestCase>;
export type StoreWriteList = {
  [filename: string]: [boolean, StoreTestCase][]; // (exists, testcase)
};
export const csvColumns = [
  'uuid',
  'tags',
  'input',
  'expected',
  'score',
  'comment',
];

export function mergeTestCases(a: StoreTestCase, b: StoreTestCase) {
  return {
    uuid: a.uuid,
    input: a.input, // inputs are the same
    expected: a.expected, // TODO: What do we do with expected?
    context: a.context, // TODO: context?
    score: b.score ?? a.score, // favor new score
    comment: b.comment ?? a.comment, // favor new comment
    tags: [...new Set((a.tags ?? []).concat(b.tags ?? []))], // merge tags,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flattenObject(obj: {[key: string]: any}, prefix = '') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattened: {[key: string]: any} = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}_${key}` : key;
    if (
      typeof value === 'object' &&
      !(value instanceof Date) &&
      value !== null &&
      !Array.isArray(value)
    ) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  });
  return flattened;
}

export function testcasesToCsv(testcases: StoreTestCase[], csvKeys?: string[]) {
  const flattened = testcases.map(testcase => flattenObject(testcase));
  const includeKeys = csvKeys === undefined;
  csvKeys = csvKeys ?? [
    ...new Set(flattened.flatMap(testcase => Object.keys(testcase))),
  ];
  return (includeKeys ? [csvKeys.join(',')] : [])
    .concat(
      ...flattened.map(testcase => {
        return csvKeys!
          .map(key => (key in testcase ? JSON.stringify(testcase[key]) : ''))
          .join(',');
      })
    )
    .join('\n');
}

export function getFormattedTestCases(
  testcases: StoreTestCase[],
  format: FileFormat = FileFormat.YAML,
  csvKeys?: string[]
): string {
  if (format === FileFormat.JSON) {
    return JSON.stringify(testcases);
  } else if (format === FileFormat.CSV) {
    return testcasesToCsv(testcases, csvKeys);
  }
  return yaml.dump(testcases);
}
