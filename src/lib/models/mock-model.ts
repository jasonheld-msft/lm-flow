import z from 'zod';

import {Conversation} from './conversation.js';
import {IModel} from './types.js';

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
export type MockModelDefinition = z.infer<typeof MockModelDefinition>;

export class MockModel implements IModel {
  private _spec: MockModelDefinition;
  private responses: Map<string, string>;

  constructor(spec: MockModelDefinition) {
    this._spec = spec;

    this.responses = new Map<string, string>(
      spec.config.cache.map(({prompt, completion}) => [
        spec.config.exactMatch ? prompt : prompt.toLowerCase(),
        completion,
      ])
    );
  }

  name(): string {
    return this._spec.name;
  }

  async complete(conversation: Conversation): Promise<string> {
    const prompt = toPrompt(conversation);
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

function toPrompt(conversation: Conversation): string {
  return conversation
    .map(turn => `${turn.speaker.toUpperCase()}: ${turn.content}`)
    .join('\n');
}
