import {
  AnyLink,
  ModelLink,
  MuxLink,
  MuxOutputUnion,
  MuxTypes,
  ProcessSequenceType,
  ProcessType,
  SequenceLink,
  processInternal,
  process,
  processMux,
  MuxOutputTypes,
  ProcessMuxType,
} from './link7.js';
import {AvailableModels, createModel} from './models.js';

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
// type M1 = ProcessType<typeof model1>;
// let vm1: M1;
// vm1.
export const m1 = await processInternal(models, model1, true);

const model2: ModelLink<number, string, boolean> = {
  type: 'model',
  name: 'model2',
  model: 'model2',
  input: (x: number) => String(x),
  output: (x: string) => x,
  judge: (observed: string, expected: string) => observed === expected,
};
export const m2 = await processInternal(models, model1, true);

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
export type S1 = ProcessType<typeof sequence1>;
export let vs1: S1;
export let vs2: ProcessSequenceType<typeof sequence1>;
// vs1.left.

export const s = await processInternal(models, sequence1, true);
export const s1 = await process(models, sequence1, true);
console.log(JSON.stringify(s1, null, 2));
export const s2 = await processInternal(models, sequence1, false);
console.log(JSON.stringify(s2, null, 2));

// This example shouldn't compile because model1
// cannot be used in a sequence with itself.
// export const illegalSequence: SequenceLink<
//   boolean,
//   string,
//   number,
//   typeof model1,
//   typeof model2
// > = {
//   type: 'sequence',
//   left: model1,
//   right: model1,
// };

export const mux1: MuxLink<number, string, [typeof model1, typeof model2]> = {
  type: 'mux',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  input: (x: number) => [
    {input: true, link: model1},
    {input: 5, link: model2},
    {input: false, link: model1},
  ],
  output: (x: (number | string)[]) => x.map(y => typeof y).join(', '),
  children: [model1, model2],
};
export type MT = MuxTypes<typeof mux1.children>;
export type MuxHead<T> = T extends readonly [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnyLink<any, infer OUTPUT>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ...infer TAIL
]
  ? OUTPUT
  : never;
export type MH = MuxHead<typeof mux1.children>;
export type MU = MuxOutputUnion<typeof mux1.children>;
export type MO = MuxOutputTypes<typeof mux1.children>;
export type MType = ProcessMuxType<typeof mux1>;
//type MUX1 = processmux
const vmux1 = await processMux(models, mux1, 3);
vmux1;
// vmux1.children[1].
console.log('=========================');
console.log(JSON.stringify(vmux1, null, 2));
const vmux2 = await process(models, mux1, 3);
vmux2.children;
console.log(JSON.stringify(vmux2, null, 2));
