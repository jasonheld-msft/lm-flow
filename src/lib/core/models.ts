import fs from 'fs';
import yaml from 'js-yaml';
import z from 'zod';
import {generateErrorMessage, ErrorMessageOptions} from 'zod-error';

import {IAvailableModels, IModel, StageBase} from './types.js';

const ModelDefinition = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('function'),
    name: z.string(),
  }),
  z.object({
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
  }),
  z.object({
    type: z.literal('openai'),
    name: z.string(),
    config: z.object({
      model: z.string(),
      max_tokens: z.number(),
    }),
  }),
]);

type ModelDefinition = z.infer<typeof ModelDefinition>;

const ModelDefinitionList = z.array(ModelDefinition);
type ModelDefinitionList = z.infer<typeof ModelDefinitionList>;

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

const functionModels: {[key: string]: IModel} = {};

function createModel(definition: ModelDefinition): IModel {
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
      return new MockModel(
        definition.name,
        definition.config.exactMatch,
        definition.config.defaultResponse,
        definition.config.cache
      );
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

  models(): IterableIterator<IModel> {
    return this.nameToModel.values();
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
