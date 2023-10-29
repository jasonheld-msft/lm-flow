import {Mode} from 'fs';

interface Ensemble<INPUT, OUTPUT, JUDGMENT> {
  distribute(input: INPUT): number;
  collect(): OUTPUT;
}

// interface StageNode<NAME extends string, INPUT, OUTPUT, JUDGMENT> {
//   next: StageNode<string, OUTPUT, unknown, unknown>;
// }

// interface MuxNode<INPUT, CHILDREN, OUTPUT, JUDGMENT> extends StageNode<INPUT, OUTPUT, JUDGMENT> {
//   children: CHILDREN;
//   next: StageNode<OUTPUT, unknown, unknown>;
// }

// interface StageNode<
//   NAME extends string,
//   CHILD extends string,
//   NEXT extends string
// > {
//   name: NAME;
//   children?: CHILD[];
//   next?: NEXT;
// }

// function StageNode<
//   NAME extends string,
//   CHILD extends string,
//   NEXT extends string
// >(name: NAME, children?: CHILD[], next?: NEXT) {
//   return {name, children, next};
// }

// const pipeline2 = StageNode('one', undefined, StageNodeX('two'));

// function f<T extends string>(s: T) {
//   return s;
// }

// const x = f<'a' | 'b'>('a');

// interface StageNode<
//   NAME extends string,
//   CHILDREN extends StageNode<string, any, any> | undefined,
//   NEXT extends StageNode<string, any, any> | undefined
// > {
//   name: NAME;
//   children?: CHILDREN[];
//   next?: NEXT;
// }

// type StageNode<NAME extends string, CHILDREN, NEXT> = {
//   name: NAME;
//   children?: CHILDREN extends StageNode<infer A, infer B, infer C>
//     ? CHILDREN[]
//     : never;
//   next?: NEXT extends StageNode<infer D, infer E, infer F> ? NEXT : never;
// };

// function StageNodeX<
//   NAME extends string,
//   CHILDREN extends StageNode<string, any, any>,
//   NEXT extends StageNode<string, any, any>
// >(
//   name: NAME,
//   children?: CHILDREN[],
//   next?: NEXT
// ): StageNode<NAME, CHILDREN, NEXT> {
//   return {name, children, next};
// }

// type StageNode<
//   NAME extends string,
//   CHILDREN extends StageNode<A, unknown, unknown>,
//   NEXT
// > = {
//   name: NAME;
//   children?: CHILDREN extends StageNode<infer A, infer B, infer C>
//     ? CHILDREN[]
//     : never;
//   next?: NEXT extends StageNode<infer D, infer E, infer F> ? NEXT : never;
// };

// function StageNodeX<
//   NAME extends string,
//   CHILDREN extends StageNode<string, any, any>,
//   NEXT extends StageNode<string, any, any>
// >(
//   name: NAME,
//   children?: CHILDREN[],
//   next?: NEXT
// ): StageNode<NAME, CHILDREN, NEXT> {
//   return {name, children, next};
// }

// const pipeline2 = StageNodeX('one', undefined, StageNodeX('two'));

// function f<T extends string>(s: T) {
//   return {value: s};
// }
// const x = f('abc');

// interface Stage<NAME extends string, INPUT, OUTPUT> {
//   name: NAME;
//   f(input: INPUT): string;
//   g(completion: string): OUTPUT;
// }

// StageNode('two', children: [StageNode('threeA'), StageNode('threeB')]));

// const pipeline = {
//   name: 'one',
//   next: {
//     name: 'two',
//     children: [{name: 'threeA'}, {name: 'threeB'}],
//     next: undefined,
//   },
// };

// // Works
// type Link<
//   NAME extends string,
//   NEXT extends Link<any, any> | undefined = undefined
// > = {
//   name: NAME;
//   next?: NEXT;
// };

// function Link<
//   NAME extends string,
//   NEXT extends Link<any, any> | undefined = undefined
// >(name: NAME, next?: NEXT): Link<NAME, NEXT> {
//   return {name, next};
// }

// const x = Link('a', Link('b'));
// const y = Link('a', 5);

// // Works 2
// type Link<
//   NAME extends string,
//   CHILD extends Link<any, any> | undefined = undefined,
//   NEXT extends Link<any, any> | undefined = undefined
// > = {
//   name: NAME;
//   children?: CHILD[];
//   next?: NEXT;
// };

// function Link<
//   NAME extends string,
//   CHILD extends Link<any, any> | undefined = undefined,
//   NEXT extends Link<any, any> | undefined = undefined
// >(name: NAME, children?: CHILD[], next?: NEXT): Link<NAME, CHILD, NEXT> {
//   return {name, children, next};
// }

// const x = Link('a', [Link('b1'), Link('b2')], Link('c'));

// // Maybe Works 3
// type Link<
//   NAME extends string,
//   INPUT,
//   OUTPUT,
//   CHILD extends Link<any, any, any, any, any> | undefined = undefined,
//   NEXT extends Link<any, any, OUTPUT, any, any> | undefined = undefined
// > = {
//   name: NAME;
//   input: (x: INPUT) => any;
//   output: (x: any) => OUTPUT;
//   children?: CHILD[];
//   next?: NEXT;
// };

// function Link<
//   NAME extends string,
//   INPUT,
//   OUTPUT,
//   CHILD extends Link<any, any, any, any, any> | undefined = undefined,
//   NEXT extends Link<any, any, OUTPUT, any, any> | undefined = undefined
// >(
//   name: NAME,
//   input: (x: INPUT) => any,
//   output: (x: any) => OUTPUT,
//   children?: CHILD[],
//   next?: NEXT
// ): Link<NAME, INPUT, OUTPUT, CHILD, NEXT> {
//   return {name, input, output, children, next};
// }

// const x = {
//   name: 'a',
//   input: (x: number) => `What is the square root of ${x}?`,
//   output: (x: string) => Number(x),
//   next: {
//     name: 'c',
//     input: (x: number) => `Please square the following value: ${x}`,
//     output: (x: string) => Number(x),
//   },
// };

// Maybe Works 3
// export type Inputs<T extends ReadonlyArray<Link<unknown, unknown>>> = {
//   [K in keyof T]: T[K] extends Link<infer I, unknown> ? I : never;
// };

// export type Inputs2<T extends ReadonlyArray<any>> = typeof Array.from<T>;
// export type Inputs3<T extends ReadonlyArray<any>> = T extends Array<infer X>
//   ? X
//   : never;
// type Inputs4<T> = T extends readonly [infer HEAD, ...infer Tail]
//   ? HEAD | Inputs4<Tail>
//   : never;

// const p = [1, true, 'string'] as const;
// type q = Inputs4<typeof p>;

// export type Outputs<T extends ReadonlyArray<Link<unknown, unknown>>> = {
//   [K in keyof T]: T[K] extends Link<infer I, unknown> ? I : never;
// };

export type Input<T extends ReadonlyArray<Link<unknown, unknown>>> =
  T[0] extends Link<infer I, unknown> ? I : never;

export type Output<T extends ReadonlyArray<Link<unknown, unknown>>> =
  T extends readonly [...unknown[], Link<unknown, infer O>] ? O : never;

type InputUnion<T> = T extends readonly [Link<infer INPUT, any>, ...infer Tail]
  ? INPUT | InputUnion<Tail>
  : never;

type OutputUnion<T> = T extends readonly [
  Link<any, infer OUTPUT>,
  ...infer Tail
]
  ? OUTPUT | OutputUnion<Tail>
  : never;

type Link<INPUT, OUTPUT> =
  | ModelLink<INPUT, OUTPUT>
  | MuxLink<INPUT, OUTPUT, any>
  | SequenceLink<INPUT, OUTPUT>;

type ModelLink<INPUT, OUTPUT> = {
  type: 'model';
  model: string;
  input: (x: INPUT) => string;
  output: (x: string) => OUTPUT;
};

type MuxLink<INPUT, OUTPUT, CHILD extends Link<any, any>[]> = {
  type: 'mux';
  input: (x: INPUT) => InputUnion<CHILD>[];
  output: (x: OutputUnion<CHILD>[]) => OUTPUT;
  children: CHILD;
};

// type SequenceLink<INPUT, OUTPUT, CHILD extends Link<any, any>[]> = {
//   type: 'sequence';
//   input: (x: INPUT) => Input<CHILD>;
//   output: (x: Output<CHILD>[]) => OUTPUT;
//   children: CHILD;
// };

type SequenceLink<
  INPUT,
  OUTPUT
  // LEFT extends Link<INPUT, any>,
  // RIGHT extends Link<any, OUTPUT>[]
> = {
  type: 'sequence';
  left: Link<INPUT, any>;
  right: Link<any, OUTPUT>;
};

export const a: MuxLink<
  number,
  string,
  [ModelLink<boolean, number>, ModelLink<string, boolean>]
> = {
  type: 'mux',
  input: (x: number) => [true, 'hello', false],
  output: (x: (number | boolean)[]) => typeof x,
  children: [
    {
      type: 'model',
      model: 'model',
      input: (x: boolean) => String(x),
      output: (x: string) => x.length,
    },
    {
      type: 'model',
      model: 'model',
      input: (x: string) => x,
      output: (x: string) => !!x,
    },
  ],
};

export const b: ModelLink<string, number> = {
  type: 'model',
  model: 'model',
  input: (x: string) => `Question: ${x}`,
  output: (x: string) => x.length,
};

export const c: SequenceLink<string, string> = {
  type: 'sequence',
  left: b,
  right: a,
};

// const x = {
//   name: 'a',
//   input: (x: number) => `What is the square root of ${x}?`,
//   output: (x: string) => Number(x),
//   next: {
//     name: 'c',
//     input: (x: number) => `Please square the following value: ${x}`,
//     output: (x: string) => Number(x),
//   },
// };
