export type Input<T extends ReadonlyArray<Stage<unknown, unknown>>> =
  T[0] extends Stage<infer I, unknown> ? I : never;

type Expected<T extends ReadonlyArray<Stage<unknown, unknown>>> = {
  [K in keyof T]: T[K] extends Stage<unknown, infer O> ? O : never;
};

export interface StageBase {
  name: string;
  defaultModel: string;
}

export interface Stage<INPUT, OUTPUT> extends StageBase {
  makePrompt(input: INPUT): string;
  backProject(output: OUTPUT): string;
  project(completion: string): OUTPUT;
}

export interface TestCase<T extends ReadonlyArray<Stage<unknown, unknown>>> {
  tags?: string[];
  input: Input<T>;
  expected: Expected<T>;
}

export interface IAvailableModels {
  getModel(stage: StageBase): IModel;
}

export interface IModel {
  name(): string;
  complete(prompt: string): Promise<string>;
  train(): Promise<void>;
}
