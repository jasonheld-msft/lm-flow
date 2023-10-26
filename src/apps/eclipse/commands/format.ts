import {Command} from 'commander';

import {Configuration, ILogger, wrapper} from '../../../lib/shared';

export interface FormatOptions {
  dryrun?: boolean;
  env?: string;
}

export async function format(this: Command, options: FormatOptions) {
  wrapper(formatInternal, this, options);
}

export async function formatInternal(
  logger: ILogger,
  configuration: Configuration,
  options: FormatOptions
) {
  console.log('Format command not implemented.');
}
