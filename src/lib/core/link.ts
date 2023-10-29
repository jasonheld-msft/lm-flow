import {IAvailableModels} from './models.js';

// The INPUT type parameter for the first Link in a tuple.
export type Input<T extends ReadonlyArray<Link<unknown, unknown>>> =
  T[0] extends Link<infer I, unknown> ? I : never;

// The OUTPUT type parameter for the last Link in a tuple.
export type Output<T extends ReadonlyArray<Link<unknown, unknown>>> =
  T extends readonly [...unknown[], Link<unknown, infer O>] ? O : never;

// The union of INPUT types of Links in a tuple.
// type InputUnion<T> = T extends readonly [
//   Link<infer INPUT, unknown>,
//   ...infer Tail
// ]
//   ? INPUT | InputUnion<Tail>
//   : never;

type InputUnion2<T> = T extends readonly [
  Link<infer INPUT, infer OUTPUT>,
  ...infer Tail
]
  ? {input: INPUT; link: Link<INPUT, OUTPUT>} | InputUnion2<Tail>
  : never;

// type t = InputUnion2<Link<any, any>[]>;
// type t2 = InputUnion2<ReadonlyArray<Link<any, any>>>;

// type Test3<T> = T extends readonly [infer A, ...infer B] ? A | Test3<B> : never;
// type t3 = Test3<[1, 2, 3, 4]>;

// type Test4<T> = T extends readonly [Link<infer X, infer Y>, ...infer B]
//   ? X | Test4<B>
//   : never;
// type t4 = Test4<[Link<boolean, string>, Link<number, boolean>]>;

// type Test5<T> = T extends readonly [Link<infer X, infer Y>, ...infer B]
//   ? {prop: X} | Test5<B>
//   : never;
// type t5 = Test5<[Link<boolean, string>, Link<number, boolean>]>;
// type t6 = Test5<Link<any, any>[]>;

// The union of OUTPUT types of Links in a tuple.
type OutputUnion<T> = T extends readonly [
  Link<unknown, infer OUTPUT>,
  ...infer Tail
]
  ? OUTPUT | OutputUnion<Tail>
  : never;

type Link<INPUT, OUTPUT> =
  | ModelLink<INPUT, OUTPUT>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | MuxLink<INPUT, OUTPUT, Link<any, any>[]>
  | SequenceLink<INPUT, OUTPUT>;

type ModelLink<INPUT, OUTPUT> = {
  type: 'model';
  name: string;
  model: string;
  input: (x: INPUT) => string;
  output: (x: string) => OUTPUT;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MuxLink<INPUT, OUTPUT, CHILD extends Link<any, any>[]> = {
  type: 'mux';
  // input: (x: INPUT) => InputUnion<CHILD>[];
  input: (x: INPUT) => InputUnion2<CHILD>[];
  output: (x: OutputUnion<CHILD>[]) => OUTPUT;
  children: CHILD;
};

type SequenceLink<INPUT, OUTPUT> = {
  type: 'sequence';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  left: Link<INPUT, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  right: Link<any, OUTPUT>;
};

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

async function processModel<INPUT, OUTPUT>(
  models: IAvailableModels,
  link: ModelLink<INPUT, OUTPUT>,
  input: INPUT
): Promise<OUTPUT> {
  const prompt = link.input(input);
  const model = models.getModel({name: link.name, defaultModel: link.model});
  const completion = await model.complete(prompt);
  const output = link.output(completion);
  return output;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMux<INPUT, OUTPUT, CHILD extends Link<any, any>[]>(
  models: IAvailableModels,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // link: MuxLink<INPUT, OUTPUT, Link<any, any>[]>,
  link: MuxLink<INPUT, OUTPUT, CHILD>,
  input: INPUT
): Promise<OUTPUT> {
  // type t = InputUnion2<Link<any, any>[]>;
  // type t2 = InputUnion2<ReadonlyArray<Link<any, any>>>;
  const promises = link.input(input).map(x => process(models, x.link, x.input));
  const results = (await Promise.all(promises)) as OutputUnion<CHILD>[];
  return link.output(results);
}

async function processSequence<INPUT, OUTPUT>(
  models: IAvailableModels,
  link: SequenceLink<INPUT, OUTPUT>,
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
const child1: ModelLink<boolean, number> = {
  type: 'model',
  name: 'child1',
  model: 'model',
  input: (x: boolean) => String(x),
  output: (x: string) => x.length,
};

const child2: ModelLink<string, boolean> = {
  type: 'model',
  name: 'child2',
  model: 'model',
  input: (x: string) => x,
  output: (x: string) => !!x,
};

export const a: MuxLink<
  number,
  string,
  [ModelLink<boolean, number>, ModelLink<string, boolean>]
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

export const b: ModelLink<string, number> = {
  type: 'model',
  name: 'model3',
  model: 'model',
  input: (x: string) => `Question: ${x}`,
  output: (x: string) => x.length,
};

export const c: SequenceLink<string, string> = {
  type: 'sequence',
  left: b,
  right: a,
};
