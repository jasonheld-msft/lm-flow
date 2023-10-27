import {Command} from 'commander';
import {DateTime} from 'luxon';
import os from 'os';

import {Configuration, ILogger, wrapper} from '../../../lib/shared/index.js';
import {evaluateTestCases} from '../../../lib/core/index.js';

import {makeModels, makeStages} from '../../../lib/pipelines/example.js';

export interface EvaluateOptions {
  concurrancy?: number;
  dryrun?: boolean;
  env?: string;
  filter?: string;
}

export async function evaluate(this: Command, options: EvaluateOptions) {
  wrapper(evaluateInternal, this, options);
}

export async function evaluateInternal(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logger: ILogger,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configuration: Configuration,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: EvaluateOptions
) {
  console.log('Evaluate command not implemented.');

  const models = makeModels();
  const stages = makeStages();

  const user = os.userInfo().username;
  const cwd = process.cwd();
  const date = DateTime.now().toLocaleString(DateTime.DATETIME_FULL);
  // command line
  // configuration
  // eclipse version
  // models description
  const info = {user, cwd, date};
  console.log(JSON.stringify(info, null, 2));

  await evaluateTestCases(configuration, models, stages);
}
