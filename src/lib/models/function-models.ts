import z from 'zod';

import {Conversation} from './conversation.js';
import {IModel} from './types.js';

export const FunctionModelDefinition = z.object({
  type: z.literal('function'),
  name: z.string(),
});
export type FunctionModelDefinition = z.infer<typeof FunctionModelDefinition>;

export class HelloModel implements IModel {
  name(): string {
    return 'hello';
  }

  async complete(conversation: Conversation): Promise<string> {
    return toPrompt(conversation);
  }

  async train(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  // Was ModelDefinition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spec(): any {
    return {type: 'function', name: 'hello'};
  }
}

export const functionModels: {[key: string]: IModel} = {
  hello: new HelloModel(),
};

function toPrompt(conversation: Conversation): string {
  return conversation
    .map(turn => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join('\n');
}
