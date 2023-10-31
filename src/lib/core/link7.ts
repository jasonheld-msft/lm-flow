/******************************************************************************
 * This is link6.ts with LEFT and RIGHT parameters added to SequenceLink.
 *
 * This works pretty well. Remaining issues:
 *   1. FIXED: ProcessType<typeof sequence1> is a union type so vs1.left only
 *      has {type, input, output}, when it should be a ProcessType<typeof model1>.
 *      Consequence is that one cannot access fields like vs1.left.prompt.
 *      IDEA: may need to template sequence on LEFT and RIGHT
 *   2. FIXED: In processSequence(), call to process(models, link.left, input) doesn't
 *      match any overloads.
 ******************************************************************************/
import {AvailableModels, IAvailableModels, createModel} from './models.js';

const models = new AvailableModels([
  createModel({
    type: 'mock',
    name: 'model1',
    config: {
      exactMatch: true,
      defaultResponse: 'error',
      cache: [
        {prompt: 'true', completion: 'This statement is true'},
        {prompt: 'false', completion: 'No way'},
      ],
    },
  }),
  createModel({
    type: 'mock',
    name: 'model2',
    config: {
      exactMatch: true,
      defaultResponse: 'error',
      cache: [
        {prompt: '22', completion: 'false'},
        {prompt: '6', completion: 'true'},
      ],
    },
  }),
]);

type ModelLink<INPUT, OUTPUT, JUDGMENT> = {
  type: 'model';
  name: string;
  model: string;
  input: (x: INPUT) => string;
  output: (x: string) => OUTPUT;
  judge?: (observed: OUTPUT, expected: OUTPUT) => JUDGMENT;
};

type SequenceLink<INPUT, OUTPUT, MIDDLE, LEFT, RIGHT> = {
  type: 'sequence';
  left: AnyLink<INPUT, MIDDLE> & LEFT;
  right: AnyLink<MIDDLE, OUTPUT> & RIGHT;
};

type AnyLink<I, O> = ModelLink<I, O, any> | SequenceLink<I, O, any, any, any>;

///////////////////////////////////////////////////////////////////////////////
//
// Processor
//
///////////////////////////////////////////////////////////////////////////////
// // Not sure why this version doesn't work. Make type of `vs1.left` be `never`.
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// type ProcessType<LINK extends AnyLink<any, any>> = LINK['type'] extends 'model'
//   ? ProcessModelType<LINK>
//   : LINK['type'] extends 'sequence'
//   ? ProcessSequenceType<LINK>
//   : never;

type ProcessType<LINK> = LINK extends ModelLink<any, any, any>
  ? ProcessModelType<LINK>
  : LINK extends SequenceLink<any, any, any, any, any>
  ? ProcessSequenceType<LINK>
  : never;

type ProcessModelType<LINK> = LINK extends ModelLink<
  infer INPUT,
  infer OUTPUT,
  infer JUDGMENT
>
  ? Pick<LINK, 'type' | 'model' | 'name'> & {
      input: INPUT;
      prompt: string;
      completion: string;
      output: OUTPUT;
      judgment?: JUDGMENT;
    }
  : never;

type ProcessSequenceType<LINK> = LINK extends SequenceLink<
  infer INPUT,
  infer OUTPUT,
  infer MIDDLE,
  infer LEFT,
  infer RIGHT
>
  ? Pick<LINK, 'type'> & {
      input: INPUT;
      left: ProcessType<LINK['left']>;
      right: ProcessType<LINK['right']>;
      output: OUTPUT;
    }
  : never;

// async function process<INPUT, OUTPUT, JUDGMENT>(
//   models: IAvailableModels,
//   link: ModelLink<INPUT, OUTPUT, JUDGMENT>,
//   input: INPUT
// ): Promise<ProcessModelType<typeof link>>;
// async function process<INPUT, OUTPUT, MIDDLE, LEFT, RIGHT>(
//   models: IAvailableModels,
//   link: SequenceLink<INPUT, OUTPUT, MIDDLE, LEFT, RIGHT>,
//   input: INPUT
// ): Promise<ProcessSequenceType<typeof link>>;
async function process<INPUT, OUTPUT>(
  models: IAvailableModels,
  link: AnyLink<INPUT, OUTPUT>,
  input: INPUT
): Promise<ProcessType<typeof link>> {
  const type = link.type;
  if (link.type === 'model') {
    return processModel(models, link, input);
  } else if (link.type === 'sequence') {
    return processSequence(models, link, input);
  } else {
    throw new Error(`Unknown link type "${type}"`);
  }
}

async function processModel<INPUT, OUTPUT, JUDGMENT>(
  models: IAvailableModels,
  link: ModelLink<INPUT, OUTPUT, JUDGMENT>,
  input: INPUT
) {
  const {type, model, name} = link;
  const prompt = link.input(input);
  const modelAPI = models.getModel({name, defaultModel: model});
  const completion = await modelAPI.complete(prompt);
  const output = link.output(completion);
  // const judgment = (link.judge && link.expected) ? link.judge(output, link.expected)
  return {type, model, name, input, prompt, completion, output};
}

async function processSequence<INPUT, OUTPUT, MIDDLE, LEFT, RIGHT>(
  models: IAvailableModels,
  link: SequenceLink<INPUT, MIDDLE, OUTPUT, LEFT, RIGHT>,
  input: INPUT
) {
  // : Promise<{
  //   type: 'sequence';
  //   left: TestCaseLink<LEFT>;
  //   right: TestCaseLink<RIGHT>;
  //   output: OUTPUT;
  // }>
  const {type} = link;
  const left = await process(models, link.left, input);
  const right = await process(models, link.right, left.output);
  return {type, input, left, right, output: right.output};
}

///////////////////////////////////////////////////////////////////////////////
//
// Test cases
//
///////////////////////////////////////////////////////////////////////////////
const model1: ModelLink<boolean, number, boolean> = {
  type: 'model',
  name: 'model1',
  model: 'model1',
  input: (x: boolean) => String(x),
  output: (x: string) => x.length,
  judge: (observed: number, expected: number) => observed === expected,
};
type M1 = ProcessType<typeof model1>;
let vm1: M1;
export const m1 = await process(models, model1, true);

const model2: ModelLink<number, string, boolean> = {
  type: 'model',
  name: 'model2',
  model: 'model2',
  input: (x: number) => String(x),
  output: (x: string) => x,
  judge: (observed: string, expected: string) => observed === expected,
};
export const m2 = await process(models, model1, true);

export const sequence1: SequenceLink<
  boolean,
  string,
  number,
  typeof model1,
  typeof model2
> = {
  type: 'sequence',
  left: model1,
  right: model2,
};
type S1 = ProcessType<typeof sequence1>;
let vs1: S1;
// vs1.left.input;
let vs2: ProcessSequenceType<typeof sequence1>;

export const s1 = await process(models, sequence1, true);
console.log(JSON.stringify(s1, null, 2));
export const s2 = await process(models, sequence1, false);
console.log(JSON.stringify(s2, null, 2));
