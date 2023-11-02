import {assert} from 'chai';
import 'mocha';
import z from 'zod';

import {
  AvailableModels,
  createModel,
  ModelLink,
  MuxLink,
  process,
  ProcessType,
  SequenceLink,
  Speaker,
  TestCaseType,
  validator,
} from '../../../src/lib/core/index.js';

describe('Ensembles', () => {
  ///////////////////////////////////////////////////////////////////////////////
  //
  //  Processing
  //
  ///////////////////////////////////////////////////////////////////////////////
  const context = {
    user: 'user1',
  };

  const models = new AvailableModels([
    createModel({
      type: 'mock',
      name: 'model1',
      config: {
        exactMatch: false,
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
        exactMatch: false,
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
    input: (x: boolean) => [{speaker: Speaker.USER, content: String(x)}],
    output: async (x: string) => x.length,
    judge: async (observed: number, expected: number) => observed === expected,
    validators: {input: z.boolean(), output: z.number()},
  };

  const model2: ModelLink<number, string, boolean> = {
    type: 'model',
    name: 'model2',
    model: 'model2',
    input: (x: number) => [{speaker: Speaker.USER, content: String(x)}],
    output: async (x: string) => x,
    judge: async (observed: string, expected: string) => observed === expected,
    validators: {input: z.number(), output: z.string()},
  };

  const sequence1: SequenceLink<
    boolean,
    string,
    number,
    typeof model1,
    typeof model2,
    unknown
  > = {
    type: 'sequence',
    left: model1,
    right: model2,
    judge: (observed: string, expected: string) => observed === expected,
    validators: {input: z.boolean(), output: z.string()},
  };

  const mux1: MuxLink<number, string, [typeof model1, typeof model2], unknown> =
    {
      type: 'mux',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      input: (x: number) => [
        {input: true, link: model1},
        {input: 5, link: model2},
        {input: false, link: model1},
      ],
      output: async (x: (number | string)[]) => x.map(y => typeof y).join(', '),
      children: [model1, model2],
      judge: (observed: string, expected: string) => observed === expected,
      validators: {input: z.number(), output: z.string()},
    };

  describe('process()', () => {
    ///////////////////////////////////////////////////////////////////////////////
    //
    //  ModelLink
    //
    ///////////////////////////////////////////////////////////////////////////////
    describe('ModelLink', () => {
      it('basic usage', async () => {
        const expectedValues: TestCaseType<typeof model1> = {
          type: 'model',
          name: 'model1',
          expected: 5,
        };
        const observedResult = await process(
          models,
          model1,
          true,
          context,
          expectedValues
        );
        const expectedResult: ProcessType<typeof model1> = {
          type: 'model',
          model: 'model1',
          name: 'model1',
          input: true,
          prompt: [{speaker: Speaker.USER, content: 'true'}],
          completion: 'This statement is true',
          output: 22,
          expected: 5,
          judgment: false,
        };
        assert.deepEqual(observedResult, expectedResult);
      });
      it('no expected property', async () => {
        const expectedValues: TestCaseType<typeof model1> = {
          type: 'model',
          name: 'model1',
        };
        const observedResult = await process(
          models,
          model1,
          true,
          context,
          expectedValues
        );
        const expectedResult: ProcessType<typeof model1> = {
          type: 'model',
          model: 'model1',
          name: 'model1',
          input: true,
          prompt: [{speaker: Speaker.USER, content: 'true'}],
          completion: 'This statement is true',
          output: 22,
        };
        assert.deepEqual(observedResult, expectedResult);
      });
      it('no judge property', async () => {
        const expectedValues: TestCaseType<typeof model1> = {
          type: 'model',
          name: 'model1',
          expected: 5,
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {judge, ...model1NoJudge} = model1;
        const observedResult = await process(
          models,
          model1NoJudge,
          true,
          context,
          expectedValues
        );
        const expectedResult: ProcessType<typeof model1> = {
          type: 'model',
          model: 'model1',
          name: 'model1',
          input: true,
          prompt: [{speaker: Speaker.USER, content: 'true'}],
          completion: 'This statement is true',
          output: 22,
        };
        assert.deepEqual(observedResult, expectedResult);
      });
      it('validation: success', async () => {
        const expectedValid: TestCaseType<typeof model1> = {
          type: 'model',
          name: 'model1',
          expected: 5,
        };
        const result = validator(model1).safeParse(expectedValid);
        assert.deepEqual(result, {success: true, data: expectedValid});
      });
      it('validation: failure', async () => {
        const expectedInvalid = {
          type: 'model',
          name: 'model1',
          expected: 'hello',
        };
        const result = validator(model1).safeParse(expectedInvalid);
        assert.isFalse(result.success);
      });
    });

    ///////////////////////////////////////////////////////////////////////////////
    //
    //  SequenceLink
    //
    ///////////////////////////////////////////////////////////////////////////////
    describe('SequenceLink', () => {
      it('basic usage', async () => {
        const expectedValues: TestCaseType<typeof sequence1> = {
          type: 'sequence',
          left: {
            type: 'model',
            name: 'model1',
            expected: 5,
          },
          right: {
            type: 'model',
            name: 'model2',
            expected: 'hi',
          },
          expected: 'true',
        };

        const observedResult = await process(
          models,
          sequence1,
          false,
          context,
          expectedValues
        );

        const expectedResult: ProcessType<typeof sequence1> = {
          type: 'sequence',
          input: false,
          left: {
            type: 'model',
            model: 'model1',
            name: 'model1',
            input: false,
            prompt: [{speaker: Speaker.USER, content: 'false'}],
            completion: 'No way',
            output: 6,
            expected: 5,
            judgment: false,
          },
          right: {
            type: 'model',
            model: 'model2',
            name: 'model2',
            input: 6,
            prompt: [{speaker: Speaker.USER, content: '6'}],
            completion: 'true',
            output: 'true',
            expected: 'hi',
            judgment: false,
          },
          expected: 'true',
          output: 'true',
          judgment: true,
        };
        assert.deepEqual(observedResult, expectedResult);
      });
      it('validation: success', async () => {
        const expectedValid: TestCaseType<typeof sequence1> = {
          type: 'sequence',
          left: {
            type: 'model',
            name: 'model1',
            expected: 5,
          },
          right: {
            type: 'model',
            name: 'model2',
            expected: 'hi', // Expected type should be number
          },
        };
        const result = validator(sequence1).safeParse(expectedValid);
        assert.deepEqual(result, {success: true, data: expectedValid});
      });
      it('validation: failure', async () => {
        const expectedInvalid = {
          type: 'sequence',
          left: {
            type: 'model',
            name: 'model1',
            expected: 5,
          },
          // Missing right side
          // right: {
          //   type: 'model',
          //   name: 'model2',
          //   expected: 'hi',
          // },
        };
        const result = validator(sequence1).safeParse(expectedInvalid);
        assert.isFalse(result.success);
      });
    });

    // This SequenceLink example shouldn't compile (and it doesn't) because model1
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

    ///////////////////////////////////////////////////////////////////////////////
    //
    //  MuxLink
    //
    ///////////////////////////////////////////////////////////////////////////////
    describe('MuxLink', () => {
      it('basic usage', async () => {
        const expectedValues: TestCaseType<typeof mux1> = {
          type: 'mux',
          children: [
            {
              type: 'model',
              name: 'model1',
              expected: 5,
            },
            {
              type: 'model',
              name: 'model2',
              expected: 'hi',
            },
            {
              type: 'model',
              name: 'model1',
              expected: 6,
            },
          ],
          expected: 'number, string, number',
        };

        const observedResult = await process(
          models,
          mux1,
          3,
          context,
          expectedValues
        );

        // TODO: figure out why ProcessType<typeof mux1> gives the wrong type.
        const expectedResult: ProcessType<typeof mux1> = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          // const expectedResult: any = {
          type: 'mux',
          input: 3,
          children: [
            {
              type: 'model',
              model: 'model1',
              name: 'model1',
              input: true,
              prompt: [{speaker: Speaker.USER, content: 'true'}],
              completion: 'This statement is true',
              output: 22,
              expected: 5,
              judgment: false,
            },
            {
              type: 'model',
              model: 'model2',
              name: 'model2',
              input: 5,
              prompt: [{speaker: Speaker.USER, content: '5'}],
              completion: 'error',
              output: 'error',
              expected: 'hi',
              judgment: false,
            },
            {
              type: 'model',
              model: 'model1',
              name: 'model1',
              input: false,
              prompt: [{speaker: Speaker.USER, content: 'false'}],
              completion: 'No way',
              output: 6,
              expected: 6,
              judgment: true,
            },
          ],
          output: 'number, string, number',
          expected: 'number, string, number',
          judgment: true,
        };
        assert.deepEqual(observedResult, expectedResult);
      });

      it('validation: success', async () => {
        const expectedValid: TestCaseType<typeof mux1> = {
          type: 'mux',
          children: [
            {
              type: 'model',
              name: 'model1',
              expected: 5,
            },
            {
              type: 'model',
              name: 'model2',
              expected: 'hi',
            },
            {
              type: 'model',
              name: 'model1',
              expected: 6,
            },
          ],
        };
        const result = validator(mux1).safeParse(expectedValid);
        assert.deepEqual(result, {success: true, data: expectedValid});
      });
      it('validation: failure', async () => {
        const expectedInvalid = {
          type: 'mux',
          children: [
            {
              type: 'model',
              name: 'model1',
              expected: 5,
            },
            {
              type: 'model',
              name: 'model2',
              expected: 'hi',
            },
            {
              type: 'model',
              name: 'model1',
              expected: true, // Should have been a number
            },
          ],
        };
        const result = validator(sequence1).safeParse(expectedInvalid);
        assert.isFalse(result.success);
      });
    });
  });
});
