import {Command} from 'commander';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import {DateTime} from 'luxon';

import {defaultInputFolder, defaultOutputFolder} from './constants';
import {ILogger, Logger} from './logger';
import {SuitePredicate, suitePredicate} from './suite-predicate';

export interface Options {
  env?: string;
  filter?: string;
  input?: string;
  key?: string;
  output?: string;
}

export interface Configuration {
  env?: string;
  filter: SuitePredicate;
  inputFolder: string;
  openAIKey?: string;
  outputFolder: string;
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
    const date = DateTime.now().toLocaleString(
      DateTime.DATETIME_FULL_WITH_SECONDS
    );
    logger.info(
      `${command.parent!.name()} tool run "${command.name()}" command on ${date}.`
    );
    if (env) {
      if (!fs.existsSync(env)) {
        logger.error(`Cannot find configuration file "${env}".`);
      } else {
        const status = fs.statSync(env);
        if (!status.isFile()) {
          logger.error(`Configuration path "${env}" is not a file.`);
        } else {
          logger.info(`Configuration from "${env}":`);
          dotenv.config({path: env});
        }
      }
    } else {
      logger.info('Configuration from default location:');
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
  const inputFolder =
    options.input || process.env.INPUT_FOLDER || defaultInputFolder;
  const outputFolder =
    options.output || process.env.OUTPUT_FOLDER || defaultOutputFolder;

  const openAIKey = options.key || process.env.OPENAI_KEY;

  const filter = options.filter ? suitePredicate(options.filter) : () => true;

  logger.info('Configuration:', 1);
  logger.info(`  INPUT_FOLDER: ${inputFolder}`, 1);
  logger.info(`  OUTPUT_FOLDER: ${outputFolder}`, 1);
  logger.info(`  FILTER: ${options.filter || '(no filter)'}`, 1);
  // Do not log openAIKey

  return {
    filter,
    inputFolder,
    openAIKey,
    outputFolder,
  };
}
