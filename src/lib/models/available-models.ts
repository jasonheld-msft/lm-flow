import {IModel} from './types.js';

export interface IAvailableModels {
  getModel(stageName: string, defaultModel: string): IModel;
  models(): IterableIterator<IModel>;
}

export class AvailableModels implements IAvailableModels {
  private nameToModel = new Map<string, IModel>();
  private stageModelOverrides = new Map<string, string>();

  constructor(models: IModel[]) {
    for (const model of models) {
      this.addModel(model);
    }
  }

  private addModel(model: IModel) {
    const name = model.name();
    if (this.nameToModel.has(name)) {
      throw new Error(`Attempting to add duplicate model ${name}`);
    }
    this.nameToModel.set(name, model);
  }

  getModel(stageName: string, defaultModel: string): IModel {
    const modelName = this.stageModelOverrides.get(stageName) || defaultModel;
    const model = this.nameToModel.get(modelName);
    if (!model) {
      throw new Error(
        `Cannot find model "${modelName}" for stage "${stageName}".`
      );
    }
    return model;
  }

  models(): IterableIterator<IModel> {
    return this.nameToModel.values();
  }

  private overrideStageModel(stageName: string, modelName: string) {
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
}
