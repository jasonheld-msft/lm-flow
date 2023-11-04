import {IModel} from './types.js';

export interface IAvailableModels {
  getModel(stageName: string, defaultModel: string): IModel;
  models(): IterableIterator<IModel>;
  used(name: string): boolean;
}

export class AvailableModels implements IAvailableModels {
  private nameToModel = new Map<string, IModel>();
  private stageModelOverrides = new Map<string, string>();
  private modelsUsed = new Set<string>();

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

    //
    // Use proxy to keep track of models that are actually used.
    // DESGIN CONSIDERATION: would it be better to keep a Set<Model>
    // instead of a Set<string>?
    //
    const modelsUsed = this.modelsUsed;
    const handler = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get(target: any, property: string) {
        if (property === 'complete') {
          modelsUsed.add(target.name());
        }
        return target[property];
      },
    };
    const wrapper = new Proxy(model, handler);

    this.nameToModel.set(name, wrapper);
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

  used(name: string): boolean {
    return this.modelsUsed.has(name);
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
