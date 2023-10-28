import {IAvailableModels} from './models.js';
import {
  Expected,
  Input,
  Stage,
  StageLogType,
  StageLogs,
  TestCase,
} from './types.js';

export class Application<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
> {
  stages: T;

  constructor(stages: T) {
    this.stages = stages;
  }

  async eval(models: IAvailableModels, testCase: TestCase<T>) {
    return evalRecursion2(
      models,
      testCase.input,
      testCase.expected,
      this.stages
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async train(models: IAvailableModels, cases: TestCase<T>[]) {
    throw new Error('no implemented');
  }
}

async function evalRecursion2<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
>(
  models: IAvailableModels,
  input: Input<T>,
  expected: Expected<T>,
  stages: T
): Promise<StageLogs<T>> {
  const [stage, ...remainingStages] = stages;
  const [expect, ...remainingExpected] = expected;
  const prompt = stage.makePrompt(input);
  const model = models.getModel(stage);
  const completion = await model.complete(prompt);
  const result = stage.parseCompletion(completion);
  const judgment = stage.judge(result, expect);
  const log: StageLogType<typeof stage> = {
    timestamp: new Date(),
    stage: stage.name,
    model: model.name(),
    input: input,
    prompt,
    completion,
    output: result,
    expected: expect,
    judgment,
  };
  if (remainingStages.length > 0) {
    return [
      log,
      ...(await evalRecursion2(
        models,
        result,
        remainingExpected,
        remainingStages
      )),
    ] as unknown as StageLogs<T>;
  } else {
    return [log] as unknown as StageLogs<T>;
  }
}
