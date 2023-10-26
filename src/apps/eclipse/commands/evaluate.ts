import {Command} from 'commander';

import {Configuration, ILogger, wrapper} from '../../../lib/shared';
import {evaluateTestCases} from '../../../lib/core';

export interface EvaluateOptions {
  dryrun?: boolean;
  env?: string;
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

  // Set up application
  // Set up models
  // Load test cases
  // Filter test cases
  // For-loop over test cases
  await evaluateTestCases(configuration);
}
