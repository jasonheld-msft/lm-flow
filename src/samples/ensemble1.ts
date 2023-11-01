import dedent from 'dedent';
import Handlebars from 'handlebars';
import {ModelLink, SequenceLink} from '../lib/core/link7.js';

export const model1: ModelLink<string, number, boolean> = {
  type: 'model',
  name: 'model1',
  model: 'model1',
  input: templatedInput<string>(dedent`
    [system] You are an assistant that counts the number of words in the user text prompt.
    [user] {{input}}
  `),
  output: (completion: string) => Number(completion),
  judge: (observed: number, expected: number) => observed === expected,
};

export const model2: ModelLink<number, string, boolean> = {
  type: 'model',
  name: 'model2',
  model: 'model2',
  input: templatedInput<number>(dedent`
    [system] You are an assistant that says hello the number of times specified by the user.
    [user] {{input}}
  `),
  output: (completion: string) => completion,
  judge: (observed: string, expected: string) => observed === expected,
};

export const sequence1: SequenceLink<
  string,
  string,
  number,
  typeof model1,
  typeof model2
> = {
  type: 'sequence',
  left: model1,
  right: model2,
};

///////////////////////////////////////////////////////////////////////////////
function templatedInput<T>(promptTemplate: string) {
  const template = Handlebars.compile(promptTemplate);
  return (input: T) => template({input});
}
