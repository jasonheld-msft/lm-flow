// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {AnyLink, SequenceLink, TestCase, TestCaseType} from '../core/index.js';

import {Configuration} from './configure.js';
// import {loadTestCases} from './load-test-cases.js';

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

  // const logger = configuration.logger;
  // const testCases = await loadTestCases(configuration, ensemble);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Trainer<INPUT, OUTPUT> {
  ensemble: AnyLink<INPUT, OUTPUT>;

  constructor(ensemble: AnyLink<INPUT, OUTPUT>) {
    this.ensemble = ensemble;
  }

  // trainOneCase<INPUT, OUTPUT>(
  //   testCase: TestCaseType<AnyLink<INPUT, OUTPUT>>,
  //   node: AnyLink<INPUT, OUTPUT>
  // ) {
  //   if (node.type === 'model') {
  //     return processModel(models, link, input, context, testCase);
  //   } else if (node.type === 'sequence') {
  //     const sequenceCase = testCase as TestCaseType<typeof node>;
  //     this.trainOneCase(sequenceCase.left, node.left);
  //     this.trainOneCase(sequenceCase.right, node.right);
  //   } else if (node.type === 'mux') {
  //     const muxCase = testCase as TestCaseType<typeof node>;
  //     for (const child of muxCase.children) {
  //       const c = child as TestCaseType<AnyLink<any, any>>;
  //       this.trainOneCase(c, )
  //     }
  //     return processMux(models, link, input, context, testCase);
  //   } else {
  //     throw new Error(`Unknown link type "${type}"`);
  //   }
  // }
}
