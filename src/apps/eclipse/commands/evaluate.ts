import {Command} from 'commander';

import {
  Configuration,
  evaluateTestCases,
  wrapper,
} from '../../../lib/core/index.js';
import {ILogger} from '../../../lib/shared/index.js';

import {makeStages} from '../../../lib/pipelines/example.js';

export interface EvaluateOptions {
  concurrancy?: number;
  dryrun?: boolean;
  env?: string;
  filter?: string;
  models?: string;
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

  // const models = configuration.models;
  const stages = makeStages();

  await evaluateTestCases(configuration, stages);
}
