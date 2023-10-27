import {IAvailableModels, IModel, StageBase} from './types.js';

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

interface CachedCompletion {
  prompt: string;
  completion: string;
}

export class MockModel implements IModel {
  private _name;
  private responses: Map<string, string>;
  private defaultResponse: string;
  private exactMatch: boolean;

  constructor(
    name: string,
    exactMatch: boolean,
    defaultResponse: string,
    responses: CachedCompletion[]
  ) {
    this._name = name;

    this.responses = new Map<string, string>(
      responses.map(({prompt, completion}) => {
        if (exactMatch) {
          return [prompt, completion];
        } else {
          return [prompt.toLowerCase(), completion.toLowerCase()];
        }
      })
    );

    this.defaultResponse = defaultResponse;
    this.exactMatch = exactMatch;
  }

  name(): string {
    return this._name;
  }

  async complete(prompt: string): Promise<string> {
    if (this.exactMatch) {
      return this.responses.get(prompt) || this.defaultResponse;
    } else {
      const prompt2 = prompt.toLowerCase();
      for (const [substring, completion] of this.responses.entries()) {
        if (prompt2.includes(substring)) {
          return completion;
        }
      }
    }
    return this.defaultResponse;
  }

  async train(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
