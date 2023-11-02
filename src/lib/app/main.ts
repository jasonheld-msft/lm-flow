#!/usr/bin/env node
import {program} from 'commander';

import {AnyLink, IModel} from '../core/index.js';

import {defaultInputFolder, defaultOutputFolder} from './constants.js';
import {wrap} from './configure2.js';
import {evaluateInternal2} from '../../apps/eclipse/commands/evaluate.js';

// import {clean, evaluate, format, train} from './commands/index.js';

export async function main<INPUT, OUTPUT>(
  ensemble: AnyLink<INPUT, OUTPUT>,
  additionalModels: IModel[]
) {
  const concurrancyOption = [
    '-c, --concurrancy <limit>',
    'maximum number of concurrant test case evaluations (default: Infinity)',
  ] as const;

  const dryrunOption = [
    '-d, --dryrun',
    "dry run - don't write to filesystem",
  ] as const;

  const envOption = [
    '-e, --env <path>',
    'path to environment file',
    '.env',
  ] as const;

  const filterOption = [
    '-f, --filter <expression>',
    'boolean expression of tags',
  ] as const;

  const inputOption = [
    '-i, --input <path>',
    `path to folder containing test cases (default: "${defaultInputFolder}")`,
  ] as const;

  const openAIKey = [
    '-k, --key <OpenAIKey>',
    'Use OpenAI with supplied key")',
  ] as const;

  const logFileOption = [
    '-l, --logFile <name>',
    'name for run log file (defaults to generated uuid)',
  ] as const;

  const modelsOption = [
    '-m, --models',
    'path to model desciption file (default from environment)',
  ] as const;

  const outputOption = [
    '-o, --output <path>',
    `path to output folder (default: "${defaultOutputFolder}")`,
  ] as const;

  program
    .name('eclipse')
    .description('Tool to train and evaluate multi-LLM systems.');

  program
    .command('eval')
    .description('Evaluate a multi-model system')
    .option(...concurrancyOption)
    .option(...dryrunOption)
    .option(...envOption)
    .option(...filterOption)
    .option(...inputOption)
    .option(...logFileOption)
    .option(...modelsOption)
    .option(...openAIKey)
    .option(...outputOption)
    .action(wrap(evaluateInternal2, ensemble, additionalModels));

  // program
  //   .command('train')
  //   .description('Train a multi-model system')
  //   .option(...concurrancyOption)
  //   .option(...dryrunOption)
  //   .option(...envOption)
  //   .option(...filterOption)
  //   .option(...inputOption)
  //   .option(...modelsOption)
  //   .option(...openAIKey)
  //   .option(...outputOption)
  //   .action(train);

  // program
  //   .command('format')
  //   .description('Format results')
  //   .option(...envOption)
  //   .option(...outputOption)
  //   .action(format);

  // program
  //   .command('clean')
  //   .description('remove all files from output folder')
  //   .option(...envOption)
  //   .option(...outputOption)
  //   .option('-x, --force', 'do not prompt before removing files')
  //   .action(clean);

  await program.parseAsync();
}
