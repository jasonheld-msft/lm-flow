import {Command} from 'commander';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {v4 as uuidv4} from 'uuid';

import {
  AvailableModels,
  IAvailableModels,
  loadModelFile,
} from '../core/index.js';
import {
  ILogger,
  Logger,
  SuitePredicate,
  suitePredicate,
} from '../shared/index.js';

import {defaultInputFolder, defaultOutputFolder} from './constants.js';

export interface Options {
  concurrancy?: string;
  dryrun?: boolean;
  env?: string;
  filter?: string;
  input?: string;
  key?: string;
  logFile?: string;
  models?: string;
  output?: string;
}

export interface Configuration {
  cmd: string;
  concurrancy: number;
  cwd: string;
  dryrun: boolean;
  env?: string;
  filter: SuitePredicate;
  inputFolder: string;
  logger: ILogger;
  logFile?: string;
  models: IAvailableModels;
  openAIKey?: string;
  outputFolder: string;
  testRunId: string;
  timestamp: Date;
  user: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function wrapper<T extends {[key: string]: any}>(
  f: (
    logger: ILogger,
    configuration: Configuration,
    options: T
  ) => Promise<void>,
  command: Command,
  options: T
): Promise<void> {
  const logger = configure(command, options);

  try {
    if (!logger.hasErrors()) {
      const configuration = validateConfiguration(logger, options);
      if (!logger.hasErrors()) {
        logger.info('', 1);
        await f(logger, configuration, options);
        logger.info('', 1);
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
    }
  } finally {
    console.log(logger.format());
    if (logger.hasErrors()) {
      logger.info('Command aborted.', 1);
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }
  }
}

function configure(command: Command, {env}: Options): ILogger {
  const logger = new Logger();
  try {
    const date = new Date();
    logger.info(
      `${command.parent!.name()} tool run "${command.name()}" command on ${date}.`,
      1
    );
    if (env) {
      if (!fs.existsSync(env)) {
        logger.error(`Cannot find configuration file "${env}".`);
      } else {
        const status = fs.statSync(env);
        if (!status.isFile()) {
          logger.error(`Configuration path "${env}" is not a file.`);
        } else {
          logger.info(`Configuration from "${env}":`, 1);
          dotenv.config({path: env});
        }
      }
    } else {
      logger.info('Configuration from default location:', 1);
      dotenv.config();
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
    } else {
      logger.error('Unknown error during configuration.');
    }
  }

  return logger;
}

function validateConfiguration(
  logger: ILogger,
  options: Options
): Configuration {
  const cmd = process.argv.join(' ');
  const cwd = process.cwd();
  const dryrun = !!options.dryrun;
  const testRunId = uuidv4();
  const timestamp = new Date();
  const user = os.userInfo().username;

  const inputFolder =
    options.input || process.env.INPUT_FOLDER || defaultInputFolder;
  const outputFolder =
    options.output || process.env.OUTPUT_FOLDER || defaultOutputFolder;

  const logFile = options.logFile;

  const modelsFile =
    options.models || process.env.MODEL_DEFINITION || './data/models.yaml';
  const modelsFromFile = loadModelFile(modelsFile);
  const models = new AvailableModels(modelsFromFile);

  const openAIKey = options.key || process.env.OPENAI_KEY;

  const filter = options.filter ? suitePredicate(options.filter) : () => true;

  const concurrancy = options.concurrancy
    ? Number(options.concurrancy)
    : Infinity;

  logger.info('Configuration:', 1);
  logger.info(`  INPUT_FOLDER: ${inputFolder}`, 1);
  logger.info(`  OUTPUT_FOLDER: ${outputFolder}`, 1);
  logger.info(`  FILTER: ${options.filter || '(no filter)'}`, 1);
  logger.info(`  CONCURRANCY: ${concurrancy}`, 1);
  // WARNING: For security, do not log openAIKey

  return {
    cmd,
    concurrancy,
    cwd,
    dryrun,
    filter,
    inputFolder,
    logFile,
    logger,
    models,
    openAIKey,
    outputFolder,
    testRunId,
    timestamp,
    user,
  };
}

export function makeRunlogFilename({
  logFile,
  outputFolder,
  testRunId,
}: Configuration) {
  const filename = logFile || testRunId + '.yaml';

  // WARNING: do not use path.posix() here. Required for resolve to work correctly
  // on Windows with absolute paths.
  const filepath = path.resolve(outputFolder, filename);
  return filepath;
}
