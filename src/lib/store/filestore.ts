import {createHash} from 'crypto';
import yaml from 'js-yaml';
import path from 'path';
import fs from 'fs';
import prompt from 'prompt-sync';
import {z} from 'zod';
import {generateErrorMessage} from 'zod-error';

import {Configuration} from '../app/configure.js';
import {walk} from '../shared/index.js';

import {
  FileFormat,
  FindOptions,
  IStore,
  InsertOptions,
  SelectOptions,
} from './types.js';

/*
- boolean expression parser evaluator
- write list
- path.posix
- structure lmflow command same as main, with sample?
*/
export const storeTestCase = z.object({
  uuid: z.string().uuid(),
  // sha: z.string(),
  tags: z.array(z.string()).optional(),
  input: z.string(),
  expected: z.string(),
  context: z.any(),
  score: z.number().optional(),
  comment: z.string().optional(),
});
export type StoreTestCase = z.infer<typeof storeTestCase>;
type StoreWriteList = {
  [filename: string]: [boolean, StoreTestCase][]; // (exists, testcase)
};
const csvColumns = ['uuid', 'tags', 'input', 'expected', 'score', 'comment'];

export async function parseStoreTestCaseFromFile(
  filepath: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<z.SafeParseReturnType<any, StoreTestCase | StoreTestCase[]>> {
  const {ext} = path.parse(filepath);
  if (ext !== '.yaml' && ext !== '.json') {
    throw new Error(
      `File ${filepath} format unknown.  Expected .yaml or .json.`
    );
  }

  const text = (await fs.promises.readFile(filepath)).toString('utf-8');
  const obj = ext === '.yaml' ? yaml.load(text) : JSON.parse(text);
  if (Array.isArray(obj)) {
    return storeTestCase.array().safeParse(obj);
  }
  return storeTestCase.safeParse(obj);
}

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

export class FileStore implements IStore {
  async find(configuration: Configuration, options: FindOptions) {
    if (options.input) {
      const filename = this.inputToFilename(
        options.input,
        configuration.storeFolder
      );
      if (!fs.existsSync(`${filename}.yaml`)) {
        throw new Error(`Path ${filename}.yaml does not exist.`);
      }
      configuration.logger.info(`Path to file: ${filename}.yaml`, 1);
    }
  }

  async insert(
    configuration: Configuration,
    options: InsertOptions,
    isUpsert = false
  ) {
    if (!options.file) {
      throw new Error('No file specified. --file');
    }
    if (!fs.existsSync(options.file)) {
      throw new Error(`File ${options.file} does not exist.`);
    }

    const result = await parseStoreTestCaseFromFile(options.file);
    if (!result.success) {
      const zodError = generateErrorMessage(result.error.issues);
      const errorMessage = `In ${options.file}: ${zodError}`;
      throw new Error(errorMessage);
    }

    this.validateStoreTestCasesToInsert(result.data);

    // Insert into store.
    const testcases = Array.isArray(result.data) ? result.data : [result.data];
    const writeList = await this.getWriteList(
      testcases,
      configuration,
      isUpsert
    );
    if (configuration.dryrun) {
      return;
    }
    await this.confirmWriteList(writeList, configuration);
  }

  async select(configuration: Configuration, options: SelectOptions) {
    if (!options.file) {
      throw new Error('No file specified. --file');
    }
    if (options.tag) {
      configuration.logger.info(`Filtering by tags: ${options.tag}`, 1);
    }

    const stack = [];
    let totalTestCases = 0;
    for await (const file of walk(configuration.storeFolder)) {
      // TODO: Should we validate on the way out of the store?
      const fileTestCases = await parseStoreTestCaseFromFile(file);
      if (!fileTestCases.success) {
        throw new Error(`Failed to parse file ${file}`);
      }
      const testCases = Array.isArray(fileTestCases.data)
        ? fileTestCases.data
        : [fileTestCases.data];

      stack.push(
        ...(options.tag
          ? this.filterTestCasesByTag(testCases, options.tag)
          : testCases)
      );

      if (stack.length > 100) {
        totalTestCases = await this.writeSelectTestCasesToFile(
          stack,
          options,
          totalTestCases
        );
        stack.length = 0;
      }
    }
    if (stack.length > 0) {
      totalTestCases = await this.writeSelectTestCasesToFile(
        stack,
        options,
        totalTestCases
      );
    }
    configuration.logger.info(
      `Wrote ${totalTestCases} test cases to ${options.file}.`,
      1
    );
  }

  async update() {}

  async upsert(configuration: Configuration, options: InsertOptions) {
    await this.insert(configuration, options, true);
  }

  inputToFilename(input: string, storeFolder: string) {
    const sha = createHash('sha256').update(input).digest('hex');

    // Grab 20 digits
    // 3 levels of directories with 2 digits each
    // 14 digits for filename
    return path.posix.join(
      ...[
        storeFolder,
        sha.substring(0, 2),
        sha.substring(2, 4),
        sha.substring(4, 6),
        sha.substring(6, 20),
      ]
    );
  }

  // Options
  // [#1]: writeList stores cases to write to each file, confirm does
  //     the work of merging with existing cases in file
  //     - fine on insert, but upsert would need to read file and merge
  //       before adding to writeList
  // #2: writeList stores entire new file contents, confirm writes it
  //     - need to merge with writeList if filename already in it
  private async confirmWriteList(
    writeList: StoreWriteList,
    configuration: Configuration
  ) {
    if (Object.keys(writeList).length === 0) {
      throw new Error('No test cases to write to store.');
    }

    // Prompt if TTY, skip for tests
    if (process.stdout.isTTY) {
      const response = prompt()('Write to store? [y/n]');
      if (!['y', 'Y', 'yes'].includes(response)) {
        configuration.logger.info('Write aborted', 1);
        return;
      }
    }

    const writePromises = Object.keys(writeList).map(async filename => {
      if (fs.existsSync(filename)) {
        const result = await parseStoreTestCaseFromFile(filename);
        if (!result.success) {
          const zodError = generateErrorMessage(result.error.issues);
          const errorMessage = `In ${filename}: ${zodError}`;
          throw new Error(errorMessage);
        }
        let fileTestCases = Array.isArray(result.data)
          ? result.data
          : [result.data];
        for (const [exists, testcase] of writeList[filename]) {
          if (exists) {
            fileTestCases = fileTestCases.map(existingTestCase => {
              if (existingTestCase.uuid === testcase.uuid) {
                return testcase;
              }
              return existingTestCase;
            });
          } else {
            fileTestCases.push(testcase);
          }
        }
        await fs.promises.writeFile(
          filename,
          getFormattedTestCases(fileTestCases)
        );
      } else {
        await fs.promises.mkdir(path.dirname(filename), {recursive: true});
        await fs.promises.writeFile(
          filename,
          getFormattedTestCases(writeList[filename].map(x => x[1])),
          {flag: 'w+'}
        );
      }
    });

    await Promise.all(writePromises);
  }

  private addToWriteList(
    writeList: StoreWriteList,
    filename: string,
    testcase: StoreTestCase,
    exists: boolean
  ) {
    if (filename in writeList) {
      writeList[filename].push([exists, testcase]);
    } else {
      writeList[filename] = [[exists, testcase]];
    }
  }

  private async processTestCaseForWriteList(
    writeList: StoreWriteList,
    testcase: StoreTestCase,
    configuration: Configuration,
    isUpsert = false
  ): Promise<boolean> {
    const filename = `${this.inputToFilename(
      testcase.input,
      configuration.storeFolder
    )}.yaml`;
    const fileExists = fs.existsSync(filename);

    if (fileExists) {
      // Check if test case exists in file
      const result = await parseStoreTestCaseFromFile(filename);
      if (!result.success) {
        const zodError = generateErrorMessage(result.error.issues);
        const errorMessage = `In ${filename}: ${zodError}`;
        throw new Error(errorMessage);
      }

      if (
        (!Array.isArray(result.data) && result.data.uuid === testcase.uuid) ||
        (Array.isArray(result.data) &&
          result.data.some(t => t.uuid === testcase.uuid))
      ) {
        // Test case exists
        if (!isUpsert) {
          configuration.logger.warning(
            `Test case ${testcase.uuid} already exists in file "${filename}".`,
            1
          );
          return false;
        }
        const existingTestCase = !Array.isArray(result.data)
          ? result.data
          : result.data.find(t => t.uuid === testcase.uuid);
        const mergedTestCase = mergeTestCases(existingTestCase!, testcase);

        if (configuration.dryrun) {
          configuration.logger.info(
            `Ready to save test case ${testcase.uuid} to "${filename}".`,
            1
          );
          return true;
        }

        this.addToWriteList(writeList, filename, mergedTestCase, true);
        return true;
      }
      // Test case does not exist
    }
    // File does not exist
    if (configuration.dryrun) {
      configuration.logger.info(
        `Ready to save test case ${testcase.uuid} to "${filename}".`,
        1
      );
      return true;
    }

    this.addToWriteList(writeList, filename, testcase, false);
    return true;
  }

  private async getWriteList(
    testcases: StoreTestCase[],
    configuration: Configuration,
    isUpsert = false
  ) {
    let testcasesInserted = 0;
    const writeList: StoreWriteList = {};

    for (const testcase of testcases) {
      if (
        await this.processTestCaseForWriteList(
          writeList,
          testcase,
          configuration,
          isUpsert
        )
      ) {
        testcasesInserted++;
      }
    }

    configuration.logger.info(`${testcases.length} test cases processed.`, 1);
    configuration.logger.info(
      `${testcasesInserted} / ${testcases.length} ready to insert.`,
      1
    );

    return writeList;
  }

  private filterTestCasesByTag(
    testCases: StoreTestCase[],
    tags: string[]
  ): StoreTestCase[] {
    return testCases.filter(testCase =>
      testCase.tags?.some(tag => tags.includes(tag))
    );
  }

  private async writeSelectTestCasesToFile(
    testCases: StoreTestCase[],
    options: SelectOptions,
    totalTestCases: number
  ): Promise<number> {
    if (
      totalTestCases === 0 &&
      options.format &&
      options.format === FileFormat.CSV
    ) {
      await fs.promises.writeFile(options.file!, csvColumns.join(',') + '\n', {
        flag: 'w+',
      });
    }
    await fs.promises.appendFile(
      options.file!,
      getFormattedTestCases(testCases, options.format, csvColumns)
    );
    return totalTestCases + testCases.length;
  }

  validateStoreTestCasesToInsert(testcases: StoreTestCase | StoreTestCase[]) {
    if (Array.isArray(testcases)) {
      // Ensure no duplicate uuids
      if (testcases.length !== new Set(testcases.map(t => t.uuid)).size) {
        throw new Error('Duplicate uuids in test cases.');
      }
    }
  }
}
