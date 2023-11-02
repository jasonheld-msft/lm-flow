import {Command} from 'commander';

import {
  Configuration,
  evaluateTestCases,
  wrapper,
} from '../../../lib/app/index.js';
import {AnyLink} from '../../../lib/core/index.js';
import {ILogger} from '../../../lib/shared/index.js';
import {sequence1} from '../../../samples/ensemble1.js';

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
  const ensemble = sequence1;
  await evaluateTestCases(configuration, ensemble);
}

export async function evaluateInternal2<INPUT, OUTPUT>(
  configuration: Configuration,
  ensemble: AnyLink<INPUT, OUTPUT>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: EvaluateOptions
) {
  await evaluateTestCases(configuration, ensemble);
}
