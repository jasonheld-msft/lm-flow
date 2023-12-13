import {AnyLink} from '../core/index.js';
import {Configuration} from './configure.js';

export interface ReportOptions {
  dryrun?: boolean;
  env?: string;
}

export async function report<INPUT, OUTPUT>(
  configuration: Configuration,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: ReportOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ensemble: AnyLink<INPUT, OUTPUT>
) {
  configuration.logger.info('Format command not implemented.', 1);
}
