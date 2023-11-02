import {AnyLink} from '../core/index.js';
import {Configuration} from './configure.js';

export interface FormatOptions {
  dryrun?: boolean;
  env?: string;
}

export async function format<INPUT, OUTPUT>(
  configuration: Configuration,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ensemble: AnyLink<INPUT, OUTPUT>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: FormatOptions
) {
  configuration.logger.info('Format command not implemented.', 1);
}
