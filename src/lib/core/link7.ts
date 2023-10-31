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

// The union of types of Links in a tuple.
type MuxTypes<T> = T extends readonly [
  AnyLink<infer INPUT, infer OUTPUT>,
  ...infer Tail
]
  ? {input: INPUT; link: AnyLink<INPUT, OUTPUT>} | MuxTypes<Tail>
  : never;

// The union of OUTPUT types of Links in a tuple.
type MuxOutputUnion<T> = T extends readonly [
  AnyLink<any, infer OUTPUT>,
  ...infer Tail
]
  ? OUTPUT | MuxOutputUnion<Tail>
  : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MuxLink<INPUT, OUTPUT, CHILDREN extends AnyLink<any, any>[]> = {
  type: 'mux';
  input: (x: INPUT) => MuxTypes<CHILDREN>[];
  output: (x: MuxOutputUnion<CHILDREN>[]) => OUTPUT;
  children: CHILDREN;
};

type AnyLink<I, O> = ModelLink<I, O, any> | SequenceLink<I, O, any, any, any> | MuxLink<I, O, any>;

///////////////////////////////////////////////////////////////////////////////
//
// Processor
//
///////////////////////////////////////////////////////////////////////////////
type ProcessType<LINK> = LINK extends ModelLink<any, any, any>
  ? ProcessModelType<LINK>
  : LINK extends SequenceLink<any, any, any, any, any>
  ? ProcessSequenceType<LINK>
  : LINK extends MuxLink<any, any, any>
  ? ProcessMuxType<LINK>
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

type ProcessMuxType<LINK> = LINK extends MuxLink<infer INPUT, infer OUTPUT, infer CHILDREN >
  ? Pick<LINK, 'type'> & {
      input: INPUT,
      // children: 
      output: OUTPUT,
    } 
  : never;

async function processWrapper<INPUT, T extends AnyLink<INPUT,any>>(
  models: IAvailableModels,
  link: T,
  input: INPUT
): Promise<ProcessType<T>> {
  return process(models, link, input) as any;
}

// async function processFixAttempt<INPUT, OUTPUT, LINK extends AnyLink<INPUT, OUTPUT>>(
//   models: IAvailableModels,
//   link: LINK,
//   input: INPUT
// ): Promise<ProcessType<typeof link>> {
//   const type = link.type;
//   if (link.type === 'model') {
//     // Type '{ type: "model"; model: string; name: string; input: INPUT; prompt: string; completion: string; output: OUTPUT; }' is not assignable to type 'ProcessType<LINK>'.
//     return processModel(models, link, input);
//   } else if (link.type === 'sequence') {
//     // Type '{ type: "sequence"; input: INPUT; left: (Pick<ModelLink<INPUT, unknown, any>, "model" | "type" | "name"> & { input: INPUT; prompt: string; completion: string; output: unknown; judgment?: any; }) | (Pick<...> & { ...; }); right: (Pick<...> & { ...; }) | (Pick<...> & { ...; }); output: unknown; }' is not assignable to type 'ProcessType<LINK>'.
//     return processSequence(models, link, input);
//   // } else if (link.type === 'mux') {
//   //   return processMux(models, link, input);
//   } else {
//     throw new Error(`Unknown link type "${type}"`);
//   }
// }

// type ExtractLink<T> = T extends AnyLink<infer INPUT, infer OUTPUT> ? AnyLink<INPUT, OUTPUT> : never;
// type ExtractInput<T> = T extends AnyLink<infer INPUT, any> ? INPUT : never;

// async function process<T>(
//   models: IAvailableModels,
//   link: ExtractLink<T>,
//   input: ExtractInput<T>
// ): Promise<ProcessType<T>> {
//   const type = link.type;
//   if (link.type === 'model') {
//     return processModel(models, link, input);
//   } else if (link.type === 'sequence') {
//     return processSequence(models, link, input);
//   } else if (link.type === 'mux') {
//     return processMux(models, link, input);
//   } else {
//     throw new Error(`Unknown link type "${type}"`);
//   }
// }

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
  } else if (link.type === 'mux') {
    return processMux(models, link, input);
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
  const {type} = link;
  const left = await process(models, link.left, input);
  const right = await process(models, link.right, left.output);
  return {type, input, left, right, output: right.output};
}

async function processMux<INPUT, OUTPUT, CHILDREN extends AnyLink<any, any>[]>(
  models: IAvailableModels,
  link: MuxLink<INPUT, OUTPUT, CHILDREN>,
  input: INPUT
) {
  const {type} = link;
  const promises = link.input(input).map(x => process(models, x.link, x.input));
  const children = (await Promise.all(promises));
  const outputs = children.map(x => x.output);
  const output = link.output(outputs as any);
  return {type, input, children, output};
}

///////////////////////////////////////////////////////////////////////////////
//
// Test cases
//
///////////////////////////////////////////////////////////////////////////////
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
// vm1.
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
let vs2: ProcessSequenceType<typeof sequence1>;

export const s = await process(models, sequence1, true);
export const s1 = await processWrapper(models, sequence1, true);
console.log(JSON.stringify(s1, null, 2));
export const s2 = await process(models, sequence1, false);
console.log(JSON.stringify(s2, null, 2));

export const mux1: MuxLink<number, string, [typeof model1, typeof model2]> = {
  type: 'mux',
  input: (x: number) => [
    {input: true, link: model1},
    {input: 5, link: model2},
    {input: false, link: model1},
  ],
  output: (x: (number | string)[]) => x.map(y => typeof y).join(', '),
  children: [model1, model2],
}
type MT = MuxTypes<typeof mux1.children>;
type MuxHead<T> = T extends readonly [AnyLink<any, infer OUTPUT>, ... infer TAIL] ? OUTPUT : never;
type MH = MuxHead<typeof mux1.children>
type MU = MuxOutputUnion<typeof mux1.children>
//type MUX1 = processmux
// const vmux1 = await processMux(models, mux1, 3);
const vmux2 = await process(models, mux1, 3);
console.log(JSON.stringify(vmux2, null, 2));
