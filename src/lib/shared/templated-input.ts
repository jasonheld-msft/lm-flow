import Handlebars from 'handlebars';

import {Conversation, Speaker} from '../models/conversation.js';

// Generates an ensemble input function, based on a supplied system prompt
// and Handlebars template for the user prompt.
export function templatedInput<INPUT, CONTEXT>(
  systemPrompt: string,
  userPromptTemplate: string
) {
  const template = Handlebars.compile(userPromptTemplate);
  return (input: INPUT, context: CONTEXT): Conversation => [
    {role: Speaker.SYSTEM, content: systemPrompt},
    {role: Speaker.USER, content: template({context, input})},
  ];
}
