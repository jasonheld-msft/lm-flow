import {assert} from 'chai';
import fs from 'fs';
import yaml from 'js-yaml';
import {fs as memfs, vol} from 'memfs';
import 'mocha';
import path from 'path';
import sinon from 'sinon';

import {
  parseStoreTestCase,
  getDataFromFile,
  FileStore,
  StoreTestCase,
} from '../../../src/lib/store/index.js';
import {Configuration} from '../../../src/lib/app/configure.js';
import {AvailableModels, Logger} from '../../../src/index.js';
import {
  IMkdirOptions,
  IWriteFileOptions,
} from 'memfs/lib/node/types/options.js';

// Necessary for memfs Blob (dom) reference
declare global {
  type ReadableStream = unknown;
  type Blob = unknown;
}

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
  beforeEach(() => {
    sinon.stub(fs, 'existsSync').callsFake(path => {
      return memfs.existsSync(path);
    });
    sinon.stub(fs.promises, 'readFile').callsFake(async path => {
      return await memfs.promises.readFile(path as string);
    });
    sinon.stub(fs.promises, 'mkdir').callsFake(async (path, options) => {
      return await memfs.promises.mkdir(
        path as string,
        options as IMkdirOptions
      );
    });
    sinon
      .stub(fs.promises, 'writeFile')
      .callsFake(async (path, data, options) => {
        return await memfs.promises.writeFile(
          path as string,
          data,
          options as IWriteFileOptions
        );
      });
    sinon.stub(fs.promises, 'appendFile').callsFake(async (path, data) => {
      return await memfs.promises.appendFile(path as string, data);
    });
    (
      sinon.stub(fs.promises, 'readdir') as unknown as sinon.SinonStub<
        [p: fs.PathLike],
        Promise<string[]>
      >
    ).callsFake(async path => {
      const dir = await memfs.promises.readdir(path as string);
      return dir.map(d => d as string);
    });
    sinon.stub(fs.promises, 'stat').callsFake(async path => {
      return (await memfs.promises.stat(path as string)) as fs.Stats;
    });
  });
  afterEach(() => {
    sinon.restore();
    vol.reset();
  });
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
    it('should find file if it exists', async () => {
      const filename = `${store.inputToFilename('test', 'mockStore')}.yaml`;
      await memfs.promises.mkdir(path.dirname(filename), {recursive: true});
      await memfs.promises.writeFile(filename, 'mockFileContents');

      try {
        await store.find(configuration, {input: 'test'});
      } catch (e) {
        assert.fail((e as Error).message);
      }
    });
    it('should throw error if file does not exist', async () => {
      try {
        await store.find(configuration, {input: 'test'});
        assert.fail('Should have thrown error');
      } catch (e) {
        assert.isTrue((e as Error).message.includes('does not exist'));
      }
    });
  });

  describe('insert', () => {
    it('should insert testcase if it does not exist', async () => {
      await memfs.promises.writeFile('/test.yaml', yaml.dump(testcase));

      try {
        await store.insert(configuration, {file: '/test.yaml'});
      } catch (e) {
        console.log((e as Error).stack);
        assert.fail((e as Error).message);
      }

      assert.isTrue(
        memfs.existsSync(
          `${store.inputToFilename(testcase.input, 'mockStore')}.yaml`
        )
      );
    });
    it('should not insert testcase if it already exists', async () => {
      const filename = `${store.inputToFilename('test', 'mockStore')}.yaml`;
      await memfs.promises.mkdir(path.dirname(filename), {recursive: true});
      await memfs.promises.writeFile(filename, yaml.dump([testcase]));
      await memfs.promises.writeFile('/test.yaml', yaml.dump(testcase));

      try {
        await store.insert(configuration, {file: '/test.yaml'});
        assert.fail('Should have thrown error');
      } catch (e) {
        console.log((e as Error).message);
        assert.isTrue((e as Error).message.includes('No test cases'));
      }
    });
  });

  describe('upsert', () => {
    it('should merge testcase if it already exists', async () => {
      const storeFilename = `${store.inputToFilename(
        testcase.input,
        'mockStore'
      )}.yaml`;
      await memfs.promises.writeFile(
        '/test.yaml',
        yaml.dump(testcaseDuplicate)
      );
      await memfs.promises.mkdir(path.dirname(storeFilename), {
        recursive: true,
      });
      await memfs.promises.writeFile(storeFilename, yaml.dump([testcase]));

      try {
        await store.upsert(configuration, {file: '/test.yaml'});

        // Check if merged
        const result = await parseStoreTestCase(getDataFromFile(storeFilename));

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

  describe('select', () => {
    it('should select testcases if they exist', async () => {
      const storeFilename = `${store.inputToFilename(
        testcase.input,
        'mockStore'
      )}.yaml`;

      await memfs.promises.writeFile('/test.yaml', yaml.dump(testcase));

      try {
        await store.insert(configuration, {file: '/test.yaml'});
        const result = await parseStoreTestCase(getDataFromFile(storeFilename));
        if (!result.success) {
          throw new Error('Failed to parse file');
        }

        await store.select(configuration, {file: '/out.yaml'});

        const out = await parseStoreTestCase(getDataFromFile('/out.yaml'));;
        if (!out.success) {
          throw new Error('Failed to parse file');
        }

        if (Array.isArray(out.data)) {
          assert.deepEqual(out.data, [testcase]);
        } else {
          throw new Error('Store data should always be an array');
        }
      } catch (e) {
        console.log(e as Error);
        console.log((e as Error).stack);
        assert.fail((e as Error).message);
      }
    });
  });
});
