import {DateTime} from 'luxon';
import z from 'zod';

export type Input<T extends ReadonlyArray<Stage<unknown, unknown, unknown>>> =
  T[0] extends Stage<infer I, unknown, unknown> ? I : never;

export type Output<T extends ReadonlyArray<Stage<unknown, unknown, unknown>>> =
  T extends readonly [...unknown[], Stage<unknown, infer O, unknown>]
    ? O
    : never;

export type Expected<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
> = {
  [K in keyof T]: T[K] extends Stage<unknown, infer O, unknown> ? O : never;
};

export type StageLogs<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
> = {
  [K in keyof T]: T[K] extends Stage<infer I, infer O, infer J>
    ? StageLog<I, O, J>
    : never;
};

export type StageLogType<T extends Stage<unknown, unknown, unknown>> =
  T extends Stage<infer I, infer O, infer J> ? StageLog<I, O, J> : never;

export interface StageBase {
  name: string;
  defaultModel: string;
}

export interface Stage<INPUT, OUTPUT, JUDGMENT> extends StageBase {
  makePrompt(input: INPUT): string;
  backProject(output: OUTPUT): string;
  project(completion: string): OUTPUT;
  judge(output: OUTPUT, expected: OUTPUT): JUDGMENT;
  types(): {
    input: z.ZodTypeAny;
    output: z.ZodTypeAny;
    judgment: z.ZodTypeAny;
  };
}

export interface StageLog<INPUT, OUTPUT, JUDGMENT> {
  timestamp: DateTime;
  stage: string;
  model: string;
  input: INPUT;
  prompt: string;
  completion: string;
  output: OUTPUT;
  expected: OUTPUT;
  judgment: JUDGMENT;
}

export interface TestCase<
  T extends ReadonlyArray<Stage<unknown, unknown, unknown>>
> {
  tags?: string[];
  sha: string;
  path: string;
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
