import {IAvailableModels, IModel, StageBase} from './types';

export class AvailableModels implements IAvailableModels {
  private nameToModel = new Map<string, IModel>();
  private stageModelOverrides = new Map<string, string>();

  addModel(model: IModel) {
    const name = model.name();
    if (this.nameToModel.has(name)) {
      throw new Error(`Attempting to add duplicate model ${name}`);
    }
    this.nameToModel.set(name, model);
  }

  overrideStageModel(stageName: string, modelName: string) {
    if (this.stageModelOverrides.has(stageName)) {
      throw new Error(
        `Attempting to add duplicate stage model override for ${stageName}`
      );
    }
    if (!this.nameToModel.has(modelName)) {
      throw new Error(
        `Unknown model "${modelName}" when configuring override for "${stageName}".`
      );
    }
    this.stageModelOverrides.set(stageName, modelName);
  }

  getModel(stage: StageBase): IModel {
    const modelName =
      this.stageModelOverrides.get(stage.name) || stage.defaultModel;
    const model = this.nameToModel.get(modelName);
    if (!model) {
      throw new Error(
        `Cannot find model "${modelName}" for stage "${stage.name}".`
      );
    }
    return model;
  }
}

export class EchoModel implements IModel {
  name(): string {
    return 'echo';
  }

  async complete(prompt: string): Promise<string> {
    return prompt;
  }

  async train(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

export class LengthModel implements IModel {
  name(): string {
    return 'length';
  }

  async complete(prompt: string): Promise<string> {
    return `The prompt length is ${prompt.length}`;
  }

  async train(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

export class ReverseModel implements IModel {
  name(): string {
    return 'reverse';
  }

  async complete(prompt: string): Promise<string> {
    return prompt.split('').reverse().join('');
  }

  async train(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
