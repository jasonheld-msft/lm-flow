import OpenAI from 'openai';
import z from 'zod';

import {Conversation} from './conversation.js';
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

export class OpenAIChatModel implements IModel {
  _spec: OpenAIModelDefinition;
  openai: OpenAI;

  constructor(spec: OpenAIModelDefinition) {
    this._spec = spec;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  name() {
    return this._spec.name;
  }

  spec() {
    return this._spec;
  }

  async complete(conversation: Conversation): Promise<string> {
    // Convert Conversation to OpenAI form.
    const messages = conversation.map(turn => ({
      role: turn.speaker,
      content: turn.content,
    }));

    const response = await this.openai.chat.completions.create({
      model: this._spec.config.model,
      // model: 'gpt-3.5-turbo-16k',
      // model: 'gpt-4',
      max_tokens: this._spec.config.max_tokens,
      messages,
    });

    return response.choices[0].message?.content || '';
  }

  train(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
