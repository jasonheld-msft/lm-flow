import z from 'zod';

import {azure_openai_api_key, azure_openai_endpoint} from '../constants.js';

import {Conversation} from './conversation.js';
import {
  createAzureOpenAILanguageModel,
  missingEnvironmentVariable,
  TypeChatLanguageModel,
} from './typechat-models.js';
import {IModel} from './types.js';

export const AzureModelDefinition = z.object({
  type: z.literal('azure'),
  name: z.string(),
  config: z.object({
    max_tokens: z.number(),
  }),
});
export type AzureModelDefinition = z.infer<typeof AzureModelDefinition>;

export class AzureModel implements IModel {
  specification: AzureModelDefinition;
  model?: TypeChatLanguageModel;

  constructor(spec: AzureModelDefinition) {
    this.specification = spec;
  }

  name() {
    return this.specification.name;
  }

  spec() {
    return this.specification;
  }

  async complete(conversation: Conversation): Promise<string> {
    const model = this.lazyCreateTypeChatModel();
    const result = await model.complete(conversation);
    if (!result.success) {
      throw new Error(`${result.message}`);
    }
    return result.data;
  }

  train(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  private lazyCreateTypeChatModel() {
    if (!this.model) {
      const env = process.env;
      const apiKey =
        env[azure_openai_api_key] ??
        missingEnvironmentVariable(azure_openai_api_key);
      const endPoint =
        env[azure_openai_endpoint] ??
        missingEnvironmentVariable(azure_openai_endpoint);

      this.model = createAzureOpenAILanguageModel(apiKey, endPoint);
    }
    return this.model;
  }
}
