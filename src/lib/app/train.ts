import {AnyLink} from '../core/index.js';

import {Configuration} from './configure.js';

export interface TrainOptions {
  dryrun?: boolean;
  env?: string;
  filter?: string;
}

export async function train<INPUT, OUTPUT>(
  configuration: Configuration,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ensemble: AnyLink<INPUT, OUTPUT>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: TrainOptions
) {
  configuration.logger.info('Train command not implemented.', 1);
}
