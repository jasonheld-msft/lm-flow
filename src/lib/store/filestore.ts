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
  StoreTestCase,
  StoreWriteList,
  csvColumns,
  getFormattedTestCases,
  mergeTestCases,
  zodStoreTestCase,
} from './testcase.js';
import {
  FileFormat,
  FindOptions,
  IStore,
  InsertOptions,
  SelectOptions,
} from './types.js';

/*
- boolean expression parser evaluator
- path.posix
*/

export function parseStoreTestCase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): z.SafeParseReturnType<any, StoreTestCase | StoreTestCase[]> {
  if (Array.isArray(obj)) {
    return zodStoreTestCase.array().safeParse(obj);
  }
  return zodStoreTestCase.safeParse(obj);
}

export async function getDataFromFile(
  filepath: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const {ext} = path.parse(filepath);
  if (ext !== '.yaml' && ext !== '.json') {
    throw new Error(
      `File ${filepath} format unknown.  Expected .yaml or .json.`
    );
  }

  const text = (await fs.promises.readFile(filepath)).toString('utf-8');
  return ext === '.yaml' ? yaml.load(text) : JSON.parse(text);
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
    if (!options.file && !options.stdin) {
      throw new Error('--stdin or --file is required.');
    }
    const result = await this.getTestCaseData(options.file);

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
    if (!options.stdout && !options.file) {
      throw new Error('No file specified. --file');
    }
    if (options.tag) {
      configuration.logger.info(`Filtering by tags: ${options.tag}`, 1);
    }

    const stack = [];
    let totalTestCases = 0;
    for await (const file of walk(configuration.storeFolder)) {
      // TODO: Should we validate on the way out of the store?
      const fileTestCases = await this.getTestCaseData(file);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseAndCheck(data: any) {
    const result = parseStoreTestCase(data);
    if (!result.success) {
      const zodError = generateErrorMessage(result.error.issues);
      const errorMessage = `Error parsing test cases: ${zodError}`;
      throw new Error(errorMessage);
    }
    return result;
  }

  private async getTestCaseData(filepath?: string) {
    if (filepath) {
      if (!fs.existsSync(filepath)) {
        throw new Error(`File ${filepath} does not exist.`);
      }
      return this.parseAndCheck(await getDataFromFile(filepath));
    } else {
      const data = fs.readFileSync(0, 'utf-8');
      return this.parseAndCheck(yaml.load(data));
    }
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
        const result = await this.getTestCaseData(filename);
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
      const result = await this.getTestCaseData(filename);

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
      if (options.stdout) {
        console.log(csvColumns.join(',') + '\n');
      } else {
        await fs.promises.writeFile(
          options.file!,
          csvColumns.join(',') + '\n',
          {
            flag: 'w+',
          }
        );
      }
    }
    if (options.stdout) {
      console.log(getFormattedTestCases(testCases, options.format, csvColumns));
    } else {
      await fs.promises.appendFile(
        options.file!,
        getFormattedTestCases(testCases, options.format, csvColumns)
      );
    }
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
