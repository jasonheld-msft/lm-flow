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

// type TupleTypes<T> = T extends readonly [infer HEAD, ...infer TAIL]
//   ? HEAD | TupleTypes<TAIL>
//   : never;

// type TupleToArray<T> = TupleTypes<T>[];

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
  | SequenceLink<any, any, INPUT, any, OUTPUT>;

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

type SequenceLink<
  LEFT extends Link<INPUT, MIDDLE>,
  RIGHT extends Link<MIDDLE, OUTPUT>,
  INPUT,
  MIDDLE,
  OUTPUT
> = {
  type: 'sequence';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  left: LEFT;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  right: RIGHT;
};

///////////////////////////////////////////////////////////////////////////////
//
// LinkTestCase
//
///////////////////////////////////////////////////////////////////////////////
// type MuxChildren<T extends ReadonlyArray<Link<unknown, unknown>>> = {
//   [K in keyof T]: Expected<T[K]>;
// };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestCaseLink<T> = T extends SequenceLink<
  infer LEFT,
  infer RIGHT,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  infer OUTPUT
> // T['type'] extends 'sequence'
  ? {
      type: 'sequence';
      // left: TestCaseLink<Link<INPUT, MIDDLE>>;
      // right: TestCaseLink<Link<MIDDLE, OUTPUT>>;

      // left: TestCaseLink<T['left']>;
      // right: TestCaseLink<T['right']>;
      // left: T['left'];
      // right: T['right'];
      left: TestCaseLink<LEFT>;
      right: TestCaseLink<RIGHT>;
      output: OUTPUT;
    }
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends MuxLink<any, any, infer OUTPUT> // MuxLink<any, infer CHILD, any>
  ? {
      type: 'mux';
      // TODO: children must be array of TestLink
      children: TupleToLinkArray<T['children']>; //MuxChildren<CHILD>;
      output: OUTPUT;
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

type Links<INPUT> =
  | ModelLink<INPUT, any, any>
  | MuxLink<INPUT, any, any>
  | SequenceLink<any, any, INPUT, any, any>;

///////////////////////////////////////////////////////////////////////////////
//
// Processor
//
///////////////////////////////////////////////////////////////////////////////
export async function process<
  LINK extends Links<INPUT>,
  // LINK extends
  //   | ModelLink<INPUT, any, any>
  //   | MuxLink<INPUT, any, any>
  //   | SequenceLink<any, any, INPUT, any, any>,
  INPUT
>(models: IAvailableModels, link: LINK, input: INPUT) {
  //: Promise<TestCaseLink<LINK>>
  const type = link.type;
  if (type === 'model') {
    return processModel(models, link, input);
  } else if (type === 'mux') {
    return processMux(models, link, input);
  } else if (type === 'sequence') {
    return processSequence(models, link, input);
  } else {
    throw new Error(`Unknown link type "${type}"`);
  }
}

async function processModel<INPUT, OUTPUT, JUDGMENT>(
  models: IAvailableModels,
  link: ModelLink<INPUT, OUTPUT, JUDGMENT>,
  input: INPUT
): Promise<TestCaseLink<ModelLink<INPUT, OUTPUT, JUDGMENT>>> {
  const {type, model, name} = link;
  const prompt = link.input(input);
  const modelAPI = models.getModel({name, defaultModel: model});
  const completion = await modelAPI.complete(prompt);
  const output = link.output(completion);
  // const judgment = (link.judge && link.expected) ? link.judge(output, link.expected)
  return {type, model, input, prompt, completion, output};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMux<INPUT, CHILD extends Links<any>[], OUTPUT>(
  // async function processMux<INPUT, CHILD extends Link<any, any>[], OUTPUT>(
  models: IAvailableModels,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  link: MuxLink<INPUT, CHILD, OUTPUT>,
  input: INPUT
  //): Promise<OUTPUT> {
): Promise<TestCaseLink<MuxLink<INPUT, CHILD, OUTPUT>>> {
  // TODO: Need to
  //   Change return type to reflect TestLink type
  //   Rename results to children
  //   Map over results/children to get results to pass to link.output.
  //   Return correct TestLink type
  const promises = link.input(input).map(x => process(models, x.link, x.input));
  // const results = (await Promise.all(promises)) as OutputUnion<CHILD>[];
  const children = (await Promise.all(promises)) as TupleToLinkArray<CHILD>;
  const results = children.map(x => x.output);
  const output = link.output(results);
  return {type: link.type, children, output};
}

async function processSequence<
  LEFT extends Link<INPUT, MIDDLE>,
  RIGHT extends Link<MIDDLE, OUTPUT>,
  INPUT,
  MIDDLE,
  OUTPUT
>(
  models: IAvailableModels,
  link: SequenceLink<LEFT, RIGHT, INPUT, MIDDLE, OUTPUT>,
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
const model1: ModelLink<boolean, number, boolean> = {
  type: 'model',
  name: 'model1',
  model: 'model1-name',
  input: (x: boolean) => String(x),
  output: (x: string) => x.length,
  judge: (observed: number, expected: number) => observed === expected,
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TModel1 = TestCaseLink<typeof model1>;

const model2: ModelLink<number, string, boolean> = {
  type: 'model',
  name: 'model2',
  model: 'model2-name',
  input: (x: number) => String(x),
  output: (x: string) => x,
  judge: (observed: string, expected: string) => observed === expected,
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TModel2 = TestCaseLink<typeof model2>;

export const Sequence1: SequenceLink<
  typeof model1,
  typeof model2,
  boolean,
  number,
  string
> = {
  type: 'sequence',
  left: model1,
  right: model2,
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TSequence1 = TestCaseLink<typeof Sequence1>;

export const mux1: MuxLink<number, [typeof model1, typeof model2], string> = {
  type: 'mux',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  input: (x: number) => [
    {input: true, link: model1},
    {input: 5, link: model2},
    {input: false, link: model1},
  ],
  output: (x: (number | boolean)[]) => typeof x,
  children: [model1, model2],
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type TMux1 = TestCaseLink<typeof mux1>;
type T2 = TupleToLinkArray<typeof mux1.children>;
// function f(x: TMux1) {
//   x.children2[0].
// }

function zz(models: IAvailableModels) {
  const z = mux1.input(5);
  const z0 = z[0];
  type Z0 = Links<typeof z0>;
  const z0Link = z0.link;
  type LINKS = Links<number | boolean>;
  const q: Links<number | boolean> = z0Link;
  const z1 = process(models, z0Link, z[0].input);
}
