import Handlebars from 'handlebars';

export function templatedInput<INPUT, CONTEXT>(promptTemplate: string) {
  const template = Handlebars.compile(promptTemplate);
  return (input: INPUT, context: CONTEXT) => template({context, input});
}
