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
import {IAvailableModels} from './models.js';

export type ModelLink<INPUT, OUTPUT, JUDGMENT> = {
  type: 'model';
  name: string;
  model: string;
  input: (x: INPUT) => string;
  output: (x: string) => OUTPUT;
  expected?: OUTPUT;
  judge?: (observed: OUTPUT, expected: OUTPUT) => JUDGMENT;
};

export type SequenceLink<INPUT, OUTPUT, MIDDLE, LEFT, RIGHT> = {
  type: 'sequence';
  left: AnyLink<INPUT, MIDDLE> & LEFT;
  right: AnyLink<MIDDLE, OUTPUT> & RIGHT;
};

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

export type MuxOutputTypes<T> = T extends  readonly [
      AnyLink<infer INPUT, infer OUTPUT>,
      ...infer Tail
    ]
  ? ProcessType<AnyLink<INPUT, OUTPUT>> | MuxOutputTypes<Tail>
  : never;
  
  
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MuxLink<INPUT, OUTPUT, CHILDREN extends AnyLink<any, any>[]> = {
  type: 'mux';
  input: (x: INPUT) => MuxTypes<CHILDREN>[];
  output: (x: MuxOutputUnion<CHILDREN>[]) => OUTPUT;
  children: CHILDREN;
};

export type AnyLink<I, O> = ModelLink<I, O, any> | SequenceLink<I, O, any, any, any> | MuxLink<I, O, any>;

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

export type ProcessMuxType<LINK> = LINK extends MuxLink<infer INPUT, infer OUTPUT, infer CHILDREN >
  ? Pick<LINK, 'type'> & {
      input: INPUT,
      // TODO: reinstate children
      // pdq: number,
      // children: MuxOutputTypes<CHILDREN>[],
      output: OUTPUT,
    } 
  : never;

export async function process<INPUT, T extends AnyLink<INPUT,any>>(
  models: IAvailableModels,
  link: T,
  input: INPUT
): Promise<ProcessType<T>> {
  // TODO: remove the following type assertion
  return processInternal(models, link, input) as any;
}

export async function processInternal<INPUT, OUTPUT>(
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
  const {type, model, name, judge, expected} = link;
  const prompt = link.input(input);
  const modelAPI = models.getModel({name, defaultModel: model});
  const completion = await modelAPI.complete(prompt);
  const output = link.output(completion);
  const judgment = (judge && expected) ? judge(output, expected) : undefined;
  return {type, model, name, input, prompt, completion, output, expected, judgment};
}

async function processSequence<INPUT, OUTPUT, MIDDLE, LEFT, RIGHT>(
  models: IAvailableModels,
  link: SequenceLink<INPUT, MIDDLE, OUTPUT, LEFT, RIGHT>,
  input: INPUT
) {
  const {type} = link;
  const left = await processInternal(models, link.left, input);
  const right = await processInternal(models, link.right, left.output);
  return {type, input, left, right, output: right.output};
}

// TODO: exported for testing
export async function processMux<INPUT, OUTPUT, CHILDREN extends AnyLink<any, any>[]>(
  models: IAvailableModels,
  link: MuxLink<INPUT, OUTPUT, CHILDREN>,
  input: INPUT
) {
  const {type} = link;
  const promises = link.input(input).map(x => process(models, x.link, x.input));
  const children = (await Promise.all(promises));
  const outputs = children.map(x => x.output);
  // TODO: remove the following type assertion to any
  const output = link.output(outputs as any);
  return {type, input, children, output};
}
