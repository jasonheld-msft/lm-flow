import fs from 'fs';
import yaml from 'js-yaml';
import z from 'zod';
import {generateErrorMessage} from 'zod-error';

export interface IAvailableModels {
  getModel(stageName: string, defaultModel: string): IModel;
  models(): IterableIterator<IModel>;
}

export interface IModel {
  name(): string;
  complete(prompt: string): Promise<string>;
  train(): Promise<void>;
  spec(): ModelDefinition;
}

export const FunctionModelDefinition = z.object({
  type: z.literal('function'),
  name: z.string(),
});
type FunctionModelDefinition = z.infer<typeof FunctionModelDefinition>;

export const MockModelDefinition = z.object({
  type: z.literal('mock'),
  name: z.string(),
  config: z.object({
    exactMatch: z.boolean(),
    defaultResponse: z.string(),
    cache: z.array(
      z.object({
        prompt: z.string(),
        completion: z.string(),
      })
    ),
  }),
});
type MockModelDefinition = z.infer<typeof MockModelDefinition>;

const OpenAIModelDefinition = z.object({
  type: z.literal('openai'),
  name: z.string(),
  config: z.object({
    model: z.string(),
    max_tokens: z.number(),
  }),
});
type OpenAIModelDefinition = z.infer<typeof OpenAIModelDefinition>;

export const ModelDefinition = z.discriminatedUnion('type', [
  FunctionModelDefinition,
  MockModelDefinition,
  OpenAIModelDefinition,
]);
type ModelDefinition = z.infer<typeof ModelDefinition>;

export const ModelDefinitionList = z.array(ModelDefinition);
export type ModelDefinitionList = z.infer<typeof ModelDefinitionList>;

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

export class HelloModel implements IModel {
  name(): string {
    return 'hello';
  }

  async complete(prompt: string): Promise<string> {
    return prompt;
  }

  async train(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  spec(): ModelDefinition {
    return {type: 'function', name: 'hello'};
  }
}

const functionModels: {[key: string]: IModel} = {
  hello: new HelloModel(),
};

export class MockModel implements IModel {
  private _spec: MockModelDefinition;
  private responses: Map<string, string>;

  constructor(spec: MockModelDefinition) {
    this._spec = spec;

    this.responses = new Map<string, string>(
      spec.config.cache.map(({prompt, completion}) => {
        if (spec.config.exactMatch) {
          return [prompt, completion];
        } else {
          return [prompt.toLowerCase(), completion.toLowerCase()];
        }
      })
    );
  }

  name(): string {
    return this._spec.name;
  }

  async complete(prompt: string): Promise<string> {
    if (this._spec.config.exactMatch) {
      return this.responses.get(prompt) || this._spec.config.defaultResponse;
    } else {
      const prompt2 = prompt.toLowerCase();
      for (const [substring, completion] of this.responses.entries()) {
        if (prompt2.includes(substring)) {
          return completion;
        }
      }
    }
    return this._spec.config.defaultResponse;
  }

  async train(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  spec() {
    return this._spec;
  }
}

export function loadModels(filename: string): IAvailableModels {
  const text = fs.readFileSync(filename, 'utf-8');
  const obj = yaml.load(text);
  const result = ModelDefinitionList.safeParse(obj);
  if (!result.success) {
    const zodError = generateErrorMessage(result.error.issues);
    const errorMessage = `In ${filename}: ${zodError}`;
    throw new Error(errorMessage);
  }

  const models = result.data.map(createModel);
  return new AvailableModels(models);
}

export function createModel(definition: ModelDefinition): IModel {
  switch (definition.type) {
    case 'function':
      if (definition.name in functionModels) {
        return functionModels[definition.name];
      } else {
        throw new Error(
          `Model definition file references unknown function model ${definition.name}.`
        );
      }
    case 'mock':
      return new MockModel(definition);
    case 'openai':
      throw new Error('OpenAI model not implemented');
    default:
      throw new Error(
        `Model definition file references unknown model type ${
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (definition as any).type
        }.`
      );
  }
}
