import {Configuration} from '../app/configure.js';

export interface FindOptions {
  input?: string;
}

export interface InsertOptions {
  file?: string;
}

export enum FileFormat {
  YAML = 'yaml',
  JSON = 'json',
  CSV = 'csv',
}

export interface SelectOptions {
  file?: string;
  format?: FileFormat;
  tag?: string[];
}

export interface UpsertOptions {
  file?: string;
}

export interface IStore {
  find(configuration: Configuration, options: FindOptions): Promise<void>;
  insert(configuration: Configuration, options: InsertOptions): Promise<void>;
  update(): Promise<void>;
  upsert(configuration: Configuration, options: UpsertOptions): Promise<void>;
}
