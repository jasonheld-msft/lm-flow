import {Stage} from '../core';

class Stage1 implements Stage<string, number> {
  makePrompt(input: string): string {
    throw new Error('Method not implemented.');
  }
  backProject(output: number): string {
    throw new Error('Method not implemented.');
  }
  project(completion: string): number {
    throw new Error('Method not implemented.');
  }
  name: string;
  defaultModel: string;

}

export const examplePipeline = [];
