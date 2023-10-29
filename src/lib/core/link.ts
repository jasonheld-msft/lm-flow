import {IAvailableModels} from './models.js';

// // The INPUT type parameter for the first Link in a tuple.
// type Input<T extends ReadonlyArray<Link<unknown, unknown>>> = T[0] extends Link<
//   infer I,
//   unknown
// >
//   ? I
//   : never;

// // The OUTPUT type parameter for the last Link in a tuple.
// type Output<T extends ReadonlyArray<Link<unknown, unknown>>> =
//   T extends readonly [...unknown[], Link<unknown, infer O>] ? O : never;

// The union of types of Links in a tuple.
type MuxTypes<T> = T extends readonly [
  Link<infer INPUT, infer OUTPUT>,
  ...infer Tail
]
  ? {input: INPUT; link: Link<INPUT, OUTPUT>} | MuxTypes<Tail>
  : never;

// type Input<T extends ReadonlyArray<Link<unknown, unknown>>> = T[0] extends Link<
//   infer I,
//   unknown
// >
//   ? I
//   : never;

// The union of OUTPUT types of Links in a tuple.
type OutputUnion<T> = T extends readonly [
  Link<unknown, infer OUTPUT>,
  ...infer Tail
]
  ? OUTPUT | OutputUnion<Tail>
  : never;

type TupleTypes<T> = T extends readonly [infer HEAD, ...infer TAIL]
  ? HEAD | TupleTypes<TAIL>
  : never;

type TupleToArray<T> = TupleTypes<T>[];

type TupleLinkTypes<T> = T extends readonly [infer HEAD, ...infer TAIL]
  ? TestCaseLink<HEAD> | TupleLinkTypes<TAIL>
  : never;

type TupleToLinkArray<T> = TupleLinkTypes<T>[];

///////////////////////////////////////////////////////////////////////////////
//
// Link, ModelLink, MuxLink, and SequenceLink data structures.
//
///////////////////////////////////////////////////////////////////////////////
type Link<INPUT, OUTPUT> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ModelLink<INPUT, OUTPUT, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | MuxLink<INPUT, Link<any, any>[], OUTPUT>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | SequenceLink<INPUT, any, OUTPUT>;

type ModelLink<INPUT, OUTPUT, JUDGMENT> = {
  type: 'model';
  name: string;
  model: string;
  input: (x: INPUT) => string;
  output: (x: string) => OUTPUT;
  judge?: (observed: OUTPUT, expected: OUTPUT) => JUDGMENT;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MuxLink<INPUT, CHILD extends Link<any, any>[], OUTPUT> = {
  type: 'mux';
  input: (x: INPUT) => MuxTypes<CHILD>[];
  output: (x: OutputUnion<CHILD>[]) => OUTPUT;
  children: CHILD;
};

type SequenceLink<INPUT, MIDDLE, OUTPUT> = {
  type: 'sequence';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  left: Link<INPUT, MIDDLE>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  right: Link<MIDDLE, OUTPUT>;
};

// type SequenceLink<INPUT, MIDDLE, OUTPUT, LEFT extends Link<INPUT, MIDDLE>, RIGHT extends Link<MIDDLE, OUTPUT>> = {
//   type: 'sequence';
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   left: LEFT;
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   right: RIGHT;
// };

///////////////////////////////////////////////////////////////////////////////
//
// LinkTestCase
//
///////////////////////////////////////////////////////////////////////////////
// type MuxChildren<T extends ReadonlyArray<Link<unknown, unknown>>> = {
//   [K in keyof T]: Expected<T[K]>;
// };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestCaseLink<T> = T extends SequenceLink<any, any, any> // T['type'] extends 'sequence'
  ? {
      type: 'sequence';
      // left: TestCaseLink<Link<INPUT, MIDDLE>>;
      // right: TestCaseLink<Link<MIDDLE, OUTPUT>>;

      // left: TestCaseLink<T['left']>;
      // right: TestCaseLink<T['right']>;
      left: T['left'];
      right: T['right'];
    }
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends MuxLink<any, any, any> // MuxLink<any, infer CHILD, any>
  ? {
      type: 'mux';
      // children: TupleToArray<{[K in keyof CHILD]: TestCaseLink<CHILD[K]>}>; //MuxChildren<CHILD>;
      // children2: TupleToLinkArray<CHILD>; //MuxChildren<CHILD>;
      children: TupleToArray<T['children']>;
    }
  : T extends ModelLink<infer INPUT, infer OUTPUT, infer JUDGMENT>
  ? {
      type: 'model';
      model: string;
      input: INPUT;
      prompt: string;
      completion: string;
      output: OUTPUT;
      expected?: OUTPUT;
      judgment?: JUDGMENT;
    }
  : never;

///////////////////////////////////////////////////////////////////////////////
//
// Processor
//
///////////////////////////////////////////////////////////////////////////////
export async function process<INPUT, OUTPUT>(
  models: IAvailableModels,
  link: Link<INPUT, OUTPUT>,
  input: INPUT
): Promise<OUTPUT> {
  switch (link.type) {
    case 'model':
      return processModel(models, link, input);
    case 'mux':
      return processMux(models, link, input);
    case 'sequence':
      return processSequence(models, link, input);
  }
}

async function processModel<INPUT, OUTPUT, JUDGMENT>(
  models: IAvailableModels,
  link: ModelLink<INPUT, OUTPUT, JUDGMENT>,
  input: INPUT
): Promise<OUTPUT> {
  const prompt = link.input(input);
  const model = models.getModel({name: link.name, defaultModel: link.model});
  const completion = await model.complete(prompt);
  const output = link.output(completion);
  // const judgment = (link.judge && link.expected) ? link.judge(output, link.expected)
  return output;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMux<INPUT, CHILD extends Link<any, any>[], OUTPUT>(
  models: IAvailableModels,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // link: MuxLink<INPUT, OUTPUT, Link<any, any>[]>,
  link: MuxLink<INPUT, CHILD, OUTPUT>,
  input: INPUT
): Promise<OUTPUT> {
  // type t = InputUnion2<Link<any, any>[]>;
  // type t2 = InputUnion2<ReadonlyArray<Link<any, any>>>;
  const promises = link.input(input).map(x => process(models, x.link, x.input));
  const results = (await Promise.all(promises)) as OutputUnion<CHILD>[];
  return link.output(results);
}

async function processSequence<INPUT, MIDDLE, OUTPUT>(
  models: IAvailableModels,
  link: SequenceLink<INPUT, MIDDLE, OUTPUT>,
  input: INPUT
): Promise<OUTPUT> {
  const middle = await process(models, link.left, input);
  return process(models, link.right, middle);
}

///////////////////////////////////////////////////////////////////////////////
//
// Test cases
//
///////////////////////////////////////////////////////////////////////////////
const child1: ModelLink<boolean, number, undefined> = {
  type: 'model',
  name: 'child1',
  model: 'model',
  input: (x: boolean) => String(x),
  output: (x: string) => x.length,
};

const child2: ModelLink<string, boolean, undefined> = {
  type: 'model',
  name: 'child2',
  model: 'model',
  input: (x: string) => x,
  output: (x: string) => !!x,
};

export const a: MuxLink<
  number,
  [
    ModelLink<boolean, number, undefined>,
    ModelLink<string, boolean, undefined>
  ],
  string
> = {
  type: 'mux',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // input: (x: number) => [true, 'hello', false],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  input: (x: number) => [
    {input: true, link: child1},
    {input: 'hello', link: child2},
    {input: false, link: child1},
  ],
  output: (x: (number | boolean)[]) => typeof x,
  children: [
    {
      type: 'model',
      name: 'model1',
      model: 'model',
      input: (x: boolean) => String(x),
      output: (x: string) => x.length,
    },
    {
      type: 'model',
      name: 'model2',
      model: 'model',
      input: (x: string) => x,
      output: (x: string) => !!x,
    },
  ],
};

export const b: ModelLink<string, number, undefined> = {
  type: 'model',
  name: 'model3',
  model: 'model',
  input: (x: string) => `Question: ${x}`,
  output: (x: string) => x.length,
};

export const e: ModelLink<number, string, undefined> = {
  type: 'model',
  name: 'model4',
  model: 'model',
  input: (x: number) => `Question: ${x}`,
  output: (x: string) => x,
};

export const c: SequenceLink<string, number, string> = {
  type: 'sequence',
  left: b,
  right: a,
};

export const d: SequenceLink<string, number, string> = {
  type: 'sequence',
  left: b,
  right: e,
};

type T1 = TestCaseLink<typeof b>;
type T2 = TestCaseLink<typeof a>;
type T3 = TestCaseLink<typeof c>;
type T4 = TestCaseLink<typeof d>;

type T5 = TestCaseLink<Link<string, number>>;

// function F(x: T2) {
//   x.children2[0].
// }
