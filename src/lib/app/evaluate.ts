import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import pLimit from 'p-limit';

import {AnyLink, process} from '../core/index.js';
import {pluralize} from '../shared/index.js';

import {Configuration} from './configure.js';
import {loadTestCases} from './load-test-cases.js';

export interface EvaluateOptions {
  concurrancy?: number;
  dryrun?: boolean;
  env?: string;
  filter?: string;
  models?: string;
}

export async function evaluate<INPUT, OUTPUT>(
  configuration: Configuration,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: EvaluateOptions,
  ensemble: AnyLink<INPUT, OUTPUT>
) {
  const logger = configuration.logger;
  const testCases = await loadTestCases(configuration, ensemble);

  // Evaluate test cases.
  const limit = pLimit(configuration.concurrancy);
  const logs = await Promise.all(
    testCases.map(testCase =>
      limit(() =>
        process(
          configuration.models,
          ensemble,
          testCase.input,
          testCase.context,
          testCase.expected
        )
      )
    )
  );

  logger.info(
    `Processed ${logs.length} test ${pluralize(logs.length, 'case', 'cases')}`,
    1
  );

  // Add ids and SHAs to test case logs.
  const cases = logs.map((log, i) => {
    const {testCaseId, sha, context} = testCases[i];
    return {testCaseId, sha, context, log};
  });

  const {cmd, cwd, testRunId, user} = configuration;
  const timestamp = configuration.timestamp;
  const models = [...configuration.models.models()]
    .filter(m => configuration.models.used(m.name()))
    .map(m => m.spec());
  const runLog = {
    testRunId,
    cmd,
    cwd,
    timestamp,
    user,
    models,
    cases,
  };

  // Serialize run log to disk.
  const text = configuration.json
    ? JSON.stringify(runLog, null, 2)
    : yaml.dump(runLog);
  // console.log(text);

  const outfile = makeRunlogFilename(configuration);
  if (configuration.dryrun) {
    logger.info(`Ready to save run log to "${outfile}".`, 1);
  } else {
    logger.info(`Saving run log to "${outfile}".`, 1);
    await fs.ensureFile(outfile);
    fs.writeFile(outfile, text, {encoding: 'utf8'});
  }
  logger.info('Completed evaluation run.', 1);
}

function makeRunlogFilename({
  json,
  logFile,
  outputFolder,
  testRunId,
}: Configuration) {
  const filename = (logFile || testRunId) + (json ? '.json' : '.yaml');

  // WARNING: do not use path.posix() here. Required for resolve to work correctly
  // on Windows with absolute paths.
  const filepath = path.resolve(outputFolder, filename);
  return filepath;
}
