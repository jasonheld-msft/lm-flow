#!/usr/bin/env node
import {program} from 'commander';

import {evaluate, format, train} from './commands';

import {
  defaultInputFolder,
  defaultOutputFolder,
} from '../../lib/shared/constants';

async function main() {
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

  const modelsOption = [
    '-m, --models',
    'comma separated list of models',
    // TODO: default value
  ] as const;

  const openAIKey = [
    '-k, --key <OpenAIKey>',
    'Use OpenAI with supplied key")',
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
    .description('Evalutate a multi-model system')
    .option(...dryrunOption)
    .option(...envOption)
    .option(...filterOption)
    .option(...inputOption)
    .option(...modelsOption)
    .option(...openAIKey)
    .option(...outputOption)
    .action(evaluate);

  program
    .command('train')
    .description('Train a multi-model system')
    .option(...dryrunOption)
    .option(...envOption)
    .option(...filterOption)
    .option(...inputOption)
    .option(...modelsOption)
    .option(...openAIKey)
    .option(...outputOption)
    .action(train);

  program
    .command('format')
    .description('Format results')
    .option(...envOption)
    .option(...outputOption)
    .action(format);

  await program.parseAsync();
}

main();
