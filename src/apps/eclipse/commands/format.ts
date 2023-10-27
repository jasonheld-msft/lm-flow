import {Command} from 'commander';

import {Configuration, ILogger, wrapper} from '../../../lib/shared/index.js';

export interface FormatOptions {
  dryrun?: boolean;
  env?: string;
}

export async function format(this: Command, options: FormatOptions) {
  wrapper(formatInternal, this, options);
}

export async function formatInternal(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logger: ILogger,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configuration: Configuration,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: FormatOptions
) {
  console.log('Format command not implemented.');
}
