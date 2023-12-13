import {assert} from 'chai';
import yaml from 'js-yaml';
import 'mocha';
import mockFs from 'mock-fs';

import {
  parseStoreTestCaseFromFile,
  FileStore,
  StoreTestCase,
} from '../../../src/lib/store/filestore.js';
import FileSystem from 'mock-fs/lib/filesystem.js';
import {Configuration} from '../../../src/lib/app/configure.js';
import {AvailableModels, Logger} from '../../../src/index.js';

describe('FileStore', () => {
  const store = new FileStore();
  const logger = new Logger();
  const configuration: Configuration = {
    azure: {
      endpoint: '',
      key: '',
    },
    cmd: '',
    concurrancy: 1,
    cwd: '',
    dryrun: false,
    filter: () => true,
    inputFolder: '',
    json: false,
    logFile: '',
    logger,
    models: new AvailableModels([]),
    openai: {
      endpoint: '',
      key: '',
    },
    outputFolder: '',
    storeFolder: 'mockStore',
    testRunId: '',
    timestamp: new Date(),
    user: '',
  };
  const testcase: StoreTestCase = {
    uuid: '84CADEE2-4392-4E72-A843-477226533E92',
    input: 'test',
    expected: 'test',
    score: 1,
  };
  const testcaseDuplicate: StoreTestCase = {
    uuid: '84CADEE2-4392-4E72-A843-477226533E92',
    input: 'test',
    expected: 'test',
    score: 2,
  };
  describe('validateStoreTestCasesToInsert', () => {
    it('should error on duplicates', () => {
      assert.throws(() => {
        store.validateStoreTestCasesToInsert([
          {
            uuid: 'test',
            input: 'test',
            expected: 'test',
            tags: ['test'],
          },
          {
            uuid: 'test',
            input: 'test2',
            expected: 'test2',
            tags: ['test2'],
          },
        ]);
      }, Error);
    });
    it('no error on no duplicates', () => {
      assert.doesNotThrow(() => {
        store.validateStoreTestCasesToInsert([
          {
            uuid: 'test',
            input: 'test',
            expected: 'test',
            tags: ['test'],
          },
          {
            uuid: 'test2',
            input: 'test2',
            expected: 'test2',
            tags: ['test2'],
          },
        ]);
      });
    });
  });

  describe('find', () => {
    afterEach(() => {
      mockFs.restore();
    });
    it('should find file if it exists', async () => {
      const files: FileSystem.DirectoryItems = {};
      files[`${store.inputToFilename('test', 'mockStore')}.yaml`] =
        'mockFileContents';
      mockFs(files);

      try {
        await store.find(configuration, {input: 'test'});
      } catch (e) {
        assert.fail((e as Error).message);
      }
    });
    it('should throw error if file does not exist', async () => {
      mockFs({});

      try {
        await store.find(configuration, {input: 'test'});
        assert.fail('Should have thrown error');
      } catch (e) {
        assert.isTrue((e as Error).message.includes('does not exist'));
      }
    });
  });

  describe('insert', () => {
    afterEach(() => {
      mockFs.restore();
    });
    it('should insert testcase if it does not exist', async () => {
      const files: FileSystem.DirectoryItems = {};
      files['test.yaml'] = yaml.dump(testcase);
      mockFs(files);

      try {
        await store.insert(configuration, {file: 'test.yaml'});
      } catch (e) {
        assert.fail((e as Error).message);
      }
    });
    it('should not insert testcase if it already exists', async () => {
      const files: FileSystem.DirectoryItems = {};
      files['test.yaml'] = yaml.dump(testcase);
      files[`${store.inputToFilename(testcase.input, 'mockStore')}.yaml`] =
        yaml.dump(testcase);
      mockFs(files);

      try {
        await store.insert(configuration, {file: 'test.yaml'});
        assert.fail('Should have thrown error');
      } catch (e) {
        console.log((e as Error).message);
        assert.isTrue((e as Error).message.includes('No test cases'));
      }
    });
  });

  describe('upsert', () => {
    afterEach(() => {
      mockFs.restore();
    });
    it('should merge testcase if it already exists', async () => {
      const files: FileSystem.DirectoryItems = {};
      files['test.yaml'] = yaml.dump(testcaseDuplicate);

      const storeFilename = `${store.inputToFilename(
        testcase.input,
        'mockStore'
      )}.yaml`;
      files[storeFilename] = yaml.dump(testcase);
      mockFs(files);

      try {
        await store.upsert(configuration, {file: 'test.yaml'});

        // Check if merged
        const result = await parseStoreTestCaseFromFile(storeFilename);

        if (!result.success) {
          throw new Error('Failed to parse file');
        }

        if (Array.isArray(result.data)) {
          assert.equal(result.data[0].score, 2);
        } else {
          throw new Error('Store data should always be an array');
        }
      } catch (e) {
        assert.fail((e as Error).message);
      }
    });
  });
});
