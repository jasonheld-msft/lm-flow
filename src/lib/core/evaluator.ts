import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import yaml from 'js-yaml';

import {Configuration, filesFromFolder} from '../shared';

export async function evaluateTestCases(configuration: Configuration) {
  // Walk input folder getting test case files.
  const files = await filesFromFolder(configuration.inputFolder);
  const promises = files.map(f => readFile(f));
  const buffers = await Promise.all(promises);
  const testCases = buffers.map(buffer => {
    const sha = createHash('sha256').update(buffer).digest('hex');
    const obj = yaml.load(buffer.toString('utf-8'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (obj as any).sha = sha;
    return obj;
  });
  for (const testCase of testCases) {
    console.log(JSON.stringify(testCase, null, 2));
  }
  // Load, hash, parse, and validate each test case.
  // Filter test cases.
  // For each case, evaluate and add results to list.
  // Serialize list to disk.
}

// function sha256(filename: string) {
//   const content = fs.readFileSync(filename);
//   return createHash('sha256').update(content).digest('hex');
// }
