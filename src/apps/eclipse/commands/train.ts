import {Command} from 'commander';

import {Configuration, ILogger, wrapper} from '../../../lib/shared';

export interface TrainOptions {
  dryrun?: boolean;
  env?: string;
}

export async function train(this: Command, options: TrainOptions) {
  wrapper(trainInternal, this, options);
}

export async function trainInternal(
  logger: ILogger,
  configuration: Configuration,
  options: TrainOptions
) {
  console.log('Train command not implemented.');
}
