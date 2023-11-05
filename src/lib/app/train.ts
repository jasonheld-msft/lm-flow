// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  AnyLink,
  SequenceLink,
  TestCase,
  TestCaseModelType,
  TestCaseMuxType,
  TestCaseType,
} from '../core/index.js';
import {Conversation, Speaker} from '../models/index.js';
import {POJO} from '../shared/index.js';

import {Configuration} from './configure.js';
import {loadTestCases} from './load-test-cases.js';
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
  // configuration.logger.info('Train command not implemented.', 1);

  const logger = configuration.logger;
  const testCases = await loadTestCases(configuration, ensemble);
  const trainer = new Trainer();
  for (const testCase of testCases) {
    trainer.trainOneCase(testCase, ensemble);
  }
  console.log(trainer.format());
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Trainer {
  //<INPUT, OUTPUT> {
  // ensemble: AnyLink<INPUT, OUTPUT>;
  trainingSets = new Map<string, Conversation[]>();
  trainingSkips = new Map<string, {input: number; expected: number}>();

  // constructor(ensemble: AnyLink<INPUT, OUTPUT>) {
  //   this.ensemble = ensemble;
  // }

  constructor() {}

  trainOneCase<INPUT, OUTPUT>(
    testCase: TestCase<AnyLink<INPUT, OUTPUT>>,
    ensemble: AnyLink<INPUT, OUTPUT>
  ) {
    const {context, expected, input} = testCase;
    this.trainOneCaseRecursion(expected, ensemble, input, context);
  }

  format(): string {
    const lines: string[] = [];
    lines.push('Finished training.');
    for (const [name, {input, expected}] of this.trainingSkips.entries()) {
      lines.push(`${name}:`);
      if (input) {
        lines.push(`  Missing input: ${input}`);
      }
      if (expected) {
        lines.push(`  Missing expected: ${expected}`);
      }
      // successfully trained
      // missing train
      lines.push(JSON.stringify(this.trainingSets.get(name), null, 2));
    }
    return lines.join('\n');
  }

  private trainOneCaseRecursion<INPUT, OUTPUT>(
    testCase: TestCaseType<AnyLink<INPUT, OUTPUT>>,
    node: AnyLink<INPUT, OUTPUT>,
    input: INPUT | undefined,
    context: POJO
  ) {
    const type = node.type;
    const i = testCase.input || input;
    // if (node.type === 'model' && testCase.type === 'model' && node.train) {
    if (node.type === 'model') {
      if (node.train) {
        // const tc = testCase as TestCaseModelType<typeof node>;
        if (i && testCase.expected) {
          const prompt = node.input(i, context);
          const content = node.train(testCase.expected);
          console.log(
            `name=${node.name}, expected=${testCase.expected}, content="${content}"`
          );
          prompt.push({role: Speaker.ASSISTANT, content});
          const cases = this.trainingSets.get(node.name);
          if (cases) {
            cases.push(prompt);
          } else {
            this.trainingSets.set(node.name, [prompt]);
          }
        }
      }
      // Log skipped case
      let skips = this.trainingSkips.get(node.name);
      if (!skips) {
        skips = {input: 0, expected: 0};
        this.trainingSkips.set(node.name, skips);
      }
      if (!i) {
        ++skips.input;
      }
      if (!testCase.expected) {
        ++skips.expected;
      }
    } else if (node.type === 'sequence') {
      const sequenceCase = testCase as TestCaseType<typeof node>;
      this.trainOneCaseRecursion(sequenceCase.left, node.left, i, context);
      this.trainOneCaseRecursion(
        sequenceCase.right,
        node.right,
        sequenceCase.left.expected,
        context
      );
    } else if (node.type === 'mux') {
      const muxCase = testCase as TestCaseMuxType<typeof node>;
      for (const child of muxCase.children) {
        // Consequence of passing undefined is that we don't support
        // input inference for training through mux nodes. In other
        // words, children must provide their own input and expected
        // values to be trained.
        this.trainOneCaseRecursion(child, node, undefined, context);
      }
    } else {
      throw new Error(`Unknown link type "${type}"`);
    }
  }
}
