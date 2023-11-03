import fs from 'fs';
import yaml from 'js-yaml';
import z from 'zod';
import {generateErrorMessage} from 'zod-error';

import {FunctionModelDefinition, functionModels} from './function-models.js';
import {MockModel, MockModelDefinition} from './mock-model.js';
import {OpenAIChatModel, OpenAIModelDefinition} from './openai-model.js';
import {IModel} from './types.js';

export const ModelDefinition = z.discriminatedUnion('type', [
  FunctionModelDefinition,
  MockModelDefinition,
  OpenAIModelDefinition,
]);
type ModelDefinition = z.infer<typeof ModelDefinition>;

export const ModelDefinitionList = z.array(ModelDefinition);
export type ModelDefinitionList = z.infer<typeof ModelDefinitionList>;

export function loadModels(filename: string): IModel[] {
  const text = fs.readFileSync(filename, 'utf-8');
  const obj = yaml.load(text);
  const result = ModelDefinitionList.safeParse(obj);
  if (!result.success) {
    const zodError = generateErrorMessage(result.error.issues);
    const errorMessage = `In ${filename}: ${zodError}`;
    throw new Error(errorMessage);
  }

  return result.data.map(createModel);
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
      return new OpenAIChatModel(definition);
    default:
      throw new Error(
        `Model definition file references unknown model type ${
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (definition as any).type
        }.`
      );
  }
}
