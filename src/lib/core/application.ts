import {IAvailableModels, Input, Stage, TestCase} from './types';

export class Application<T extends ReadonlyArray<Stage<unknown, unknown>>> {
  stages: T;

  constructor(stages: T) {
    this.stages = stages;
  }

  async eval(models: IAvailableModels, testCase: TestCase<T>) {
    return evalRecursion(models, testCase.input, this.stages);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async train(models: IAvailableModels, cases: TestCase<T>[]) {
    throw new Error('no implemented');
  }
}

async function evalRecursion<T extends ReadonlyArray<Stage<unknown, unknown>>>(
  models: IAvailableModels,
  input: Input<T>,
  stages: T
) {
  const [stage, ...remainingStages] = stages;
  const prompt = stage.makePrompt(input);
  const model = models.getModel(stage);
  const completion = await model.complete(prompt);
  const result = stage.project(completion);
  if (remainingStages.length > 0) {
    return evalRecursion(models, result, remainingStages);
  } else {
    return result;
  }
}
