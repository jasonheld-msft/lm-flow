import z from 'zod';

import {
  default_openai_endpoint,
  openai_api_key,
  openai_endpoint,
  openai_organization,
} from '../constants.js';

import {Conversation} from './conversation.js';
import {
  createOpenAILanguageModel,
  missingEnvironmentVariable,
  TypeChatLanguageModel,
} from './typechat-models.js';
import {IModel} from './types.js';

export const OpenAIModelDefinition = z.object({
  type: z.literal('openai'),
  name: z.string(),
  config: z.object({
    model: z.string(),
    max_tokens: z.number(),
  }),
});
export type OpenAIModelDefinition = z.infer<typeof OpenAIModelDefinition>;

export class OpenAIModel implements IModel {
  specification: OpenAIModelDefinition;
  model?: TypeChatLanguageModel;

  constructor(spec: OpenAIModelDefinition) {
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
        env[openai_api_key] ?? missingEnvironmentVariable(openai_api_key);
      const model = this.specification.config.model;
      const endPoint = env[openai_endpoint] ?? default_openai_endpoint;
      const org = env[openai_organization] ?? '';

      this.model = createOpenAILanguageModel(apiKey, model, endPoint, org);
    }
    return this.model;
  }
}
