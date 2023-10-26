import dedent from 'dedent';
import Handlebars from 'handlebars';
import z from 'zod';

import {Application, AvailableModels, MockModel, Stage} from '../core';

class HandlebarsStage<T> {
  template: HandlebarsTemplateDelegate;

  constructor(promptTemplate: string) {
    this.template = Handlebars.compile(promptTemplate);
  }

  makePrompt(input: T): string {
    return this.template({input});
  }
}

class Stage1
  extends HandlebarsStage<string>
  implements Stage<string, number, boolean>
{
  name: string;
  defaultModel: string;

  constructor(name: string, model: string) {
    super(dedent`
      [system] You are an assistant that counts the number of workds in the user text prompt.
      [user] {{input}}
      `);
    this.name = name;
    this.defaultModel = model;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  backProject(output: number): string {
    throw new Error('Method not implemented.');
  }

  project(completion: string): number {
    return Number(completion);
  }

  judge(output: number, expected: number): boolean {
    return output === expected;
  }

  // foo(): z.ZodTypeAny {
  //   return z.string();
  // }
  types() {
    return {
      input: z.string(),
      output: z.number(),
      judgment: z.boolean(),
    };
  }
}

class Stage2
  extends HandlebarsStage<number>
  implements Stage<number, string, boolean>
{
  name: string;
  defaultModel: string;

  constructor(name: string, model: string) {
    super(dedent`
      [system] You are an assistant that says hello the number of times specified by the user.
      [user] {{input}}
      `);
    this.name = name;
    this.defaultModel = model;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  backProject(output: string): string {
    throw new Error('Method not implemented.');
  }

  project(completion: string): string {
    return completion;
  }

  judge(output: string, expected: string): boolean {
    return output === expected;
  }

  types() {
    return {
      input: z.number(),
      output: z.string(),
      judgment: z.boolean(),
    };
  }
}

export function makeStages() {
  const stages = [
    new Stage1('stage1', 'stage1model'),
    new Stage2('stage2', 'stage2model'),
  ] as const;
  return stages;
}

async function go() {
  const models = new AvailableModels([
    new MockModel('stage1model', false, '0', [
      {prompt: 'hello, world', completion: '2'},
      {prompt: 'hello', completion: '1'},
    ]),
    new MockModel('stage2model', false, "I don't understand", [
      {prompt: '0', completion: 'goodbye'},
      {prompt: '1', completion: 'hello'},
      {prompt: '2', completion: 'hello hello'},
    ]),
  ]);

  const stages = [
    new Stage1('stage1', 'stage1model'),
    new Stage2('stage2', 'stage2model'),
  ] as const;

  const application = new Application(stages);
  const testCases = [
    {
      input: 'hello, world',
      expected: [2, 'hello hello'] as const,
    },
    {
      input: 'hi there',
      expected: [2, 'hello hello'] as const,
    },
  ];

  for (const testCase of testCases) {
    const logs = await application.eval(models, testCase);
    console.log(JSON.stringify(logs, null, 2));
  }
}

// go();
