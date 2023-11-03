#!/usr/bin/env node
import {program} from 'commander';

import {
  defaultConcurrancy,
  defaultEnvFile,
  defaultInputFolder,
  defaultOutputFolder,
  environmentHelp,
} from '../constants.js';
import {AnyLink} from '../core/index.js';
import {IModel} from '../models/index.js';

import {clean} from './clean.js';
import {wrap} from './configure.js';
import {evaluate} from './evaluator.js';
import {format} from './format.js';
import {train} from './train.js';

// import {clean, evaluate, format, train} from './commands/index.js';

export async function main<INPUT, OUTPUT>(
  ensemble: AnyLink<INPUT, OUTPUT>,
  additionalModels: IModel[]
) {
  const concurrancyOption = [
    '-c, --concurrancy <limit>',
    `maximum number of concurrant test case evaluations (default: ${defaultConcurrancy})`,
  ] as const;

  const dryrunOption = [
    '-d, --dryrun',
    "NOT YET IMPLEMENTED: dry run - don't write to filesystem",
  ] as const;

  const envOption = [
    '-e, --env <path>',
    `path to environment file (defaults to ${defaultEnvFile})`,
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

  const extraHelp = environmentHelp();

  // TODO: name should be executable name
  program
    .name('lm-flow')
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
    .addHelpText('after', extraHelp)
    .action(wrap(evaluate, ensemble, additionalModels));

  program
    .command('train')
    .description(
      'NOT YET IMPLEMENTED: generate training sets for models in an ensemble'
    )
    .option(...concurrancyOption)
    .option(...dryrunOption)
    .option(...envOption)
    .option(...filterOption)
    .option(...inputOption)
    .option(...modelsOption)
    .option(...openAIKey)
    .option(...outputOption)
    .addHelpText('after', extraHelp)
    .action(wrap(train, ensemble, additionalModels));

  program
    .command('format')
    .description('NOT YET IMPLMENTED: Format results')
    .option(...envOption)
    .option(...outputOption)
    .addHelpText('after', extraHelp)
    .action(wrap(format, ensemble, additionalModels));

  program
    .command('clean')
    .description('remove all files from output folder')
    .option(...envOption)
    .option(...outputOption)
    .option('-x, --force', 'do not prompt before removing files')
    .addHelpText('after', extraHelp)
    .action(wrap(clean, ensemble, additionalModels));

  program.addHelpText('after', extraHelp);
  await program.parseAsync();
}
