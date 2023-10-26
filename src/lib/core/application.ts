import {DateTime} from 'luxon';
import {
  IAvailableModels,
  Input,
  Output,
  Stage,
  StageLogType,
  StageLogs,
  TestCase,
} from './types';

export class Application<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
> {
  stages: T;

  constructor(stages: T) {
    this.stages = stages;
  }

  async eval(models: IAvailableModels, testCase: TestCase<T>) {
    return evalRecursion2(models, testCase.input, this.stages);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async train(models: IAvailableModels, cases: TestCase<T>[]) {
    throw new Error('no implemented');
  }
}

async function evalRecursion<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
>(models: IAvailableModels, input: Input<T>, stages: T): Promise<Output<T>> {
  const [stage, ...remainingStages] = stages;
  const prompt = stage.makePrompt(input);
  const model = models.getModel(stage);
  const completion = await model.complete(prompt);
  const result = stage.project(completion);
  if (remainingStages.length > 0) {
    return evalRecursion(models, result, remainingStages);
  } else {
    return result as Output<T>;
  }
}

async function evalRecursion2<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
>(models: IAvailableModels, input: Input<T>, stages: T): Promise<StageLogs<T>> {
  const [stage, ...remainingStages] = stages;
  const prompt = stage.makePrompt(input);
  const model = models.getModel(stage);
  const completion = await model.complete(prompt);
  const result = stage.project(completion);
  const judgement = stage.judge(result, result);
  const log: StageLogType<typeof stage> = {
    timestamp: DateTime.now(),
    stage: stage.name,
    model: model.name(),
    input: input,
    prompt,
    completion,
    output: result,
    judgement,
  };
  if (remainingStages.length > 0) {
    return [
      log,
      ...(await evalRecursion2(models, result, remainingStages)),
    ] as unknown as StageLogs<T>;
  } else {
    return [log] as unknown as StageLogs<T>;
  }
}
