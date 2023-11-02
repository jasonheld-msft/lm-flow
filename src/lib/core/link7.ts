/******************************************************************************
 *
 *  This code seems to work. Because of type assertions, process() seems to
 *  return the correct type.
 *
 * TODO:
 *   1. Compare the two versions of process (one is commented out)
 *   2. Remove the type assertion to any in both versions of process()
 *   3. Remove the type assertion to any from processMux()
 *   4. Remove the type assertion to MuxOutputTypes<CHILDREN>[] from processMux()
 *
 ******************************************************************************/

// This file has a need for the use of lots of generic type parameters of type any.
/* eslint-disable @typescript-eslint/no-explicit-any */

import z from 'zod';

import {IAvailableModels} from './models.js';

///////////////////////////////////////////////////////////////////////////////
//
// AnyLink, ModelLink, SequenceLink, MuxLink
//
///////////////////////////////////////////////////////////////////////////////
export type AnyLink<I, O> =
  | ModelLink<I, O, any>
  | SequenceLink<I, O, any, any, any>
  | MuxLink<I, O, any>;

export type ModelLink<INPUT, OUTPUT, JUDGMENT> = {
  type: 'model';
  name: string;
  model: string;
  input: (x: INPUT) => string;
  output: (x: string) => OUTPUT;
  judge?: (observed: OUTPUT, expected: OUTPUT) => JUDGMENT;
  validators: Validators<INPUT, OUTPUT>;
};

export type SequenceLink<INPUT, OUTPUT, MIDDLE, LEFT, RIGHT> = {
  type: 'sequence';
  left: AnyLink<INPUT, MIDDLE> & LEFT;
  right: AnyLink<MIDDLE, OUTPUT> & RIGHT;
  validators: Validators<INPUT, OUTPUT>;
};

//
// MuxLink
//

// The union of types of Links in a tuple.
export type MuxTypes<T> = T extends readonly [
  AnyLink<infer INPUT, infer OUTPUT>,
  ...infer Tail
]
  ? {input: INPUT; link: AnyLink<INPUT, OUTPUT>} | MuxTypes<Tail>
  : never;

// The union of OUTPUT types of Links in a tuple.
export type MuxOutputUnion<T> = T extends readonly [
  AnyLink<any, infer OUTPUT>,
  ...infer Tail
]
  ? OUTPUT | MuxOutputUnion<Tail>
  : never;

export type MuxOutputTypes<T> = T extends readonly [infer HEAD, ...infer TAIL]
  ? ProcessType<HEAD> | MuxOutputTypes<TAIL>
  : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MuxLink<INPUT, OUTPUT, CHILDREN extends AnyLink<any, any>[]> = {
  type: 'mux';
  input: (x: INPUT) => MuxTypes<CHILDREN>[];
  output: (x: MuxOutputUnion<CHILDREN>[]) => OUTPUT;
  children: CHILDREN;
  validators: Validators<INPUT, OUTPUT>;
};

export type Validators<INPUT, OUTPUT> = {
  input: z.ZodType<any, any, INPUT>;
  output: z.ZodType<any, any, OUTPUT>;
};

///////////////////////////////////////////////////////////////////////////////
//
// TestCase
//
///////////////////////////////////////////////////////////////////////////////
export interface TestCase<T extends AnyLink<any, any>> {
  test_case_id: string;
  tags?: string[];
  sha: string;
  input: ExtractInput<T>;
  expected: TestCaseType<T>;
}

export type TestCaseType<LINK> = LINK extends ModelLink<any, any, any>
  ? TestCaseModelType<LINK>
  : LINK extends SequenceLink<any, any, any, any, any>
  ? TestCaseSequenceType<LINK>
  : LINK extends MuxLink<any, any, any>
  ? TestCaseMuxType<LINK>
  : never;

export type TestCaseModelType<LINK> = LINK extends ModelLink<
  any,
  infer OUTPUT,
  any
>
  ? Pick<LINK, 'type' | 'name'> & {
      // input: INPUT;
      expected?: OUTPUT;
    }
  : never;

export type TestCaseSequenceType<LINK> = LINK extends SequenceLink<
  any,
  any,
  any,
  any,
  any
>
  ? Pick<LINK, 'type'> & {
      left: TestCaseType<LINK['left']>;
      right: TestCaseType<LINK['right']>;
    }
  : never;

export type TestCaseMuxOutputTypes<T> = T extends readonly [
  infer HEAD,
  ...infer TAIL
]
  ? TestCaseType<HEAD> | TestCaseMuxOutputTypes<TAIL>
  : never;

export type TestCaseMuxType<LINK> = LINK extends MuxLink<
  any,
  any,
  infer CHILDREN
>
  ? Pick<LINK, 'type'> & {
      children: TestCaseMuxOutputTypes<CHILDREN>[];
    }
  : never;

///////////////////////////////////////////////////////////////////////////////
//
// Processor
//
///////////////////////////////////////////////////////////////////////////////
export type ProcessType<LINK> = LINK extends ModelLink<any, any, any>
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
      expected?: OUTPUT;
      judgment?: JUDGMENT;
    }
  : never;

export type ProcessSequenceType<LINK> = LINK extends SequenceLink<
  infer INPUT,
  infer OUTPUT,
  any,
  any,
  any
>
  ? Pick<LINK, 'type'> & {
      input: INPUT;
      left: ProcessType<LINK['left']>;
      right: ProcessType<LINK['right']>;
      output: OUTPUT;
    }
  : never;

export type ProcessMuxType<LINK> = LINK extends MuxLink<
  infer INPUT,
  infer OUTPUT,
  infer CHILDREN
>
  ? Pick<LINK, 'type'> & {
      input: INPUT;
      children: MuxOutputTypes<CHILDREN>[];
      output: OUTPUT;
    }
  : never;

// TODO: Compare the following version of process<> with the uncommented version.
// export async function process<INPUT, T extends AnyLink<INPUT,any>>(
//   models: IAvailableModels,
//   link: T,
//   input: INPUT
// ): Promise<ProcessType<T>> {
//   // TODO: remove the following type assertion to any
//   return processInternal(models, link, input) as any;
// }
export type MakeLink<T> = T extends AnyLink<any, any>
  ? AnyLink<any, any>
  : never;
export type ExtractInput<T> = T extends AnyLink<infer I, any> ? I : never;

export async function process<T>(
  models: IAvailableModels,
  link: T,
  input: ExtractInput<T>,
  testCase: TestCaseType<T>
): Promise<ProcessType<T>> {
  // TODO: remove the following type assertion to any
  return processInternal(
    models,
    link as unknown as MakeLink<T>,
    input,
    testCase
  ) as any;
}

export async function processInternal<INPUT, OUTPUT>(
  models: IAvailableModels,
  link: AnyLink<INPUT, OUTPUT>,
  input: INPUT,
  // TODO: fix type cast in processInternal
  testCase: any // TestCaseType<AnyLink<INPUT, OUTPUT>>
): Promise<ProcessType<typeof link>> {
  const type = link.type;
  if (link.type === 'model') {
    return processModel(models, link, input, testCase);
  } else if (link.type === 'sequence') {
    return processSequence(models, link, input, testCase);
  } else if (link.type === 'mux') {
    return processMux(models, link, input, testCase);
  } else {
    throw new Error(`Unknown link type "${type}"`);
  }
}

async function processModel<INPUT, OUTPUT, JUDGMENT>(
  models: IAvailableModels,
  link: ModelLink<INPUT, OUTPUT, JUDGMENT>,
  input: INPUT,
  testCase: TestCaseType<ModelLink<INPUT, OUTPUT, JUDGMENT>>
) {
  verifyTestCaseType(testCase, link);
  const {type, model, name, judge} = link;
  const {expected} = testCase;
  const prompt = link.input(input);
  const modelAPI = models.getModel(name, model);
  const completion = await modelAPI.complete(prompt);
  const output = link.output(completion);
  const judgment = judge && expected ? judge(output, expected) : undefined;
  const optionals = judge && expected ? {judgment, expected} : {};
  return {
    type,
    model,
    name,
    input,
    prompt,
    completion,
    output,
    ...optionals,
  };
}

// function copyDefinedProperties(obj: {[key: string]: any}) {
//   return Object.fromEntries(
//     Object.entries(obj).filter(([k, v]) => v !== undefined)
//   );
// }

async function processSequence<INPUT, OUTPUT, MIDDLE, LEFT, RIGHT>(
  models: IAvailableModels,
  link: SequenceLink<INPUT, MIDDLE, OUTPUT, LEFT, RIGHT>,
  input: INPUT,
  testCase: TestCaseType<SequenceLink<INPUT, MIDDLE, OUTPUT, LEFT, RIGHT>>
) {
  verifyTestCaseType(testCase, link);
  const {type} = link;
  const left = await processInternal(models, link.left, input, testCase.left);
  const right = await processInternal(
    models,
    link.right,
    left.output,
    testCase.right
  );
  return {type, input, left, right, output: right.output};
}

// TODO: exported for testing
export async function processMux<
  INPUT,
  OUTPUT,
  CHILDREN extends AnyLink<any, any>[]
>(
  models: IAvailableModels,
  link: MuxLink<INPUT, OUTPUT, CHILDREN>,
  input: INPUT,
  testCase: TestCaseMuxType<MuxLink<any, any, CHILDREN>>
) {
  verifyTestCaseType(testCase, link);
  const {type} = link;
  const promises = link
    .input(input)
    .map((x, i) => process(models, x.link, x.input, testCase.children[i]));
  const children = await Promise.all(promises);
  const outputs = children.map(x => x.output);
  // TODO: remove the following type assertion to any
  const output = link.output(outputs as any);
  // TODO: remove the following type assertion to MuxOutputTypes<CHILDREN>[]
  return {
    type,
    input,
    children: children as MuxOutputTypes<CHILDREN>[],
    output,
  };
}

///////////////////////////////////////////////////////////////////////////////
//
// Validator
//
///////////////////////////////////////////////////////////////////////////////
export function validator<INPUT, OUTPUT>(
  link: AnyLink<INPUT, OUTPUT>
): z.ZodTypeAny {
  const type = link.type;
  if (link.type === 'model') {
    return z.object({
      type: z.literal('model'),
      name: z.string(),
      expected: link.validators.output,
    });
  } else if (link.type === 'sequence') {
    return z.object({
      type: z.literal('sequence'),
      left: validator(link.left),
      right: validator(link.right),
    });
  } else if (link.type === 'mux') {
    return validatorMux(link);
  } else {
    throw new Error(`Unknown link type "${type}"`);
  }
}

function validatorMux<INPUT, OUTPUT, CHILDREN extends AnyLink<any, any>[]>(
  link: MuxLink<INPUT, OUTPUT, CHILDREN>
) {
  const c = link.children.map(x => validator(x));
  return z.object({
    type: z.literal('mux'),
    children: z.array(z.union(c as any)),
  });
}

///////////////////////////////////////////////////////////////////////////////
//
// Utility functions
//
///////////////////////////////////////////////////////////////////////////////
function verifyTestCaseType(
  testCase: {type: string; name?: string},
  link: {type: string; name?: string}
) {
  if (testCase.type !== link.type) {
    throw new Error(
      `Type mismatch: testCase.type (${testCase.type}) !== link.type (${link.type})`
    );
  }
  if (testCase.name && link.name && testCase.name !== link.name) {
    throw new Error(
      `Name mismatch: testCase.name (${testCase.name}) !== link.name (${link.name})`
    );
  }
}
