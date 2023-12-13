import fs from 'fs-extra';
import path from 'path';
import prompt from 'prompt-sync';
import {rimraf} from 'rimraf';

import {Configuration} from './configure.js';
import {filesFromFolder, pluralize} from '../shared/index.js';

export interface CleanOptions {
  dryrun?: boolean;
  env?: string;
  force?: boolean;
}

export async function clean(
  configuration: Configuration,
  options: CleanOptions
) {
  const logger = configuration.logger;
  const outputFolder = path.resolve(configuration.outputFolder);

  let requireConfirmation = !options.force;

  if (fs.existsSync(outputFolder)) {
    const status = fs.statSync(outputFolder);
    if (!status.isDirectory()) {
      logger.info(
        `Path "${outputFolder}" does not appear to be a site folder.`,
        1
      );
      requireConfirmation = true;
    } else {
      const parts = path.parse(outputFolder);
      if (parts.name !== 'runs') {
        logger.info(
          `Path "${outputFolder}" does not appear to be a site folder.`,
          1
        );
        requireConfirmation = true;
      }
      const files = await filesFromFolder(outputFolder);
      const extras = files.filter(file => {
        const ext = path.parse(file).ext.toLowerCase();
        return ext !== '.yaml' && ext !== '.json';
      });
      if (extras.length > 0) {
        requireConfirmation = true;
        logger.info(
          `Path "${outputFolder}" contains files with extensions other than ".yaml"`,
          1
        );
        for (const file of extras) {
          const parts = path.parse(file);
          if (parts.ext !== 'yaml') {
            logger.info(`  ${file}`, 1);
          }
        }
      } else {
        logger.info(
          `Path "${outputFolder}" contains ${files.length} yaml ${pluralize(
            files.length,
            'file',
            'files'
          )}.`,
          1
        );
      }
    }
    if (options.dryrun) {
      logger.info(`Ready to erase "${outputFolder}"`, 1);
    } else {
      if (requireConfirmation) {
        const response = prompt()(
          `Are you sure you want to erase "${outputFolder}" (y/n)? `
        );
        if (response === 'y' || response === 'Y' || response === 'yes') {
          logger.info(`Erasing "${outputFolder}"`, 1);
          rimraf(outputFolder);
        } else {
          logger.info(`Keeping "${outputFolder}"`, 1);
        }
      } else {
        logger.info(`Erasing "${outputFolder}"`, 1);
        rimraf(outputFolder);
      }
    }
  } else {
    logger.warning(`Path "${outputFolder}" does not exist.`, 1);
  }
}
