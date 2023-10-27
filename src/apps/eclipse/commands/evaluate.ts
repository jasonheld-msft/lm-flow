import {Command} from 'commander';

import {Configuration, ILogger, wrapper} from '../../../lib/shared/index.js';
import {evaluateTestCases} from '../../../lib/core/index.js';

import {makeStages} from '../../../lib/pipelines/example.js';

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

  const stages = makeStages();
  // Set up application
  // Set up models
  // Load test cases
  // Filter test cases
  // For-loop over test cases
  await evaluateTestCases(configuration, stages);
}
