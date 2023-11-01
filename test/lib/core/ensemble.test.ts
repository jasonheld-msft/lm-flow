import {assert} from 'chai';
import 'mocha';

import {AvailableModels, createModel} from '../../../src/lib/index.js';
import {
  process,
  ModelLink,
  TestCaseType,
  ProcessType,
  SequenceLink,
  MuxLink,
} from '../../../src/lib/core/link7.js';

describe('Ensembles', () => {
  ///////////////////////////////////////////////////////////////////////////////
  //
  //  Processing
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

  const model2: ModelLink<number, string, boolean> = {
    type: 'model',
    name: 'model2',
    model: 'model2',
    input: (x: number) => String(x),
    output: (x: string) => x,
    judge: (observed: string, expected: string) => observed === expected,
  };

  const sequence1: SequenceLink<
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

  const mux1: MuxLink<number, string, [typeof model1, typeof model2]> = {
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
          expectedValues
        );
        const expectedResult: ProcessType<typeof model1> = {
          type: 'model',
          model: 'model1',
          name: 'model1',
          input: true,
          prompt: 'true',
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
          expectedValues
        );
        const expectedResult: ProcessType<typeof model1> = {
          type: 'model',
          model: 'model1',
          name: 'model1',
          input: true,
          prompt: 'true',
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
        const {judge, ...model1NoJudge} = model1;
        const observedResult = await process(
          models,
          model1NoJudge,
          true,
          expectedValues
        );
        const expectedResult: ProcessType<typeof model1> = {
          type: 'model',
          model: 'model1',
          name: 'model1',
          input: true,
          prompt: 'true',
          completion: 'This statement is true',
          output: 22,
        };
        assert.deepEqual(observedResult, expectedResult);
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
            name: 'model1',
            expected: 'hi',
          },
        };

        const observedResult = await process(
          models,
          sequence1,
          false,
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
            prompt: 'false',
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
            prompt: '6',
            completion: 'true',
            output: 'true',
            expected: 'hi',
            judgment: false,
          },
          output: 'true',
        };
        assert.deepEqual(observedResult, expectedResult);
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
        };

        const observedResult = await process(models, mux1, 3, expectedValues);

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
              prompt: 'true',
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
              prompt: '5',
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
              prompt: 'false',
              completion: 'No way',
              output: 6,
              expected: 6,
              judgment: true,
            },
          ],
          output: 'number, string, number',
        };
        assert.deepEqual(observedResult, expectedResult);
      });
    });
  });
});
