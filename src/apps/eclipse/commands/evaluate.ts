import {Command} from 'commander';

import {Configuration, ILogger, wrapper} from '../../../lib/shared';

export interface EvaluateOptions {
  dryrun?: boolean;
  env?: string;
}

export async function evaluate(this: Command, options: EvaluateOptions) {
  wrapper(evaluateInternal, this, options);
}

export async function evaluateInternal(
  logger: ILogger,
  configuration: Configuration,
  options: EvaluateOptions
) {
  console.log('Evaluate command not implemented.');
}
