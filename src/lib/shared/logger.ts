import {pluralize} from './pluralize.js';

export enum LogType {
  ERROR,
  INFO,
  WARNING,
}

export interface ILogger {
  log(type: LogType, message: string): void;
  error(message: string): void;
  info(message: string, level: number): void;
  warning(message: string, level: number): void;

  getErrors(): string[];
  getInfo(): string[];
  getWarnings(): string[];

  format(): string;
  hasErrors(): boolean;
}

export class Logger implements ILogger {
  _errors = 0;
  _info = 0;
  _warnings = 0;
  private records: {type: LogType; message: string}[] = [];

  log(type: LogType, message: string): void {
    if (type === LogType.ERROR) {
      ++this._errors;
    } else if (type === LogType.INFO) {
      ++this._info;
      console.log(message);
    } else {
      ++this._warnings;
    }

    this.records.push({type, message});
  }

  error(message: string) {
    this.log(LogType.ERROR, message);
  }

  info(message: string) {
    this.log(LogType.INFO, message);
  }

  warning(message: string) {
    this.log(LogType.WARNING, message);
  }

  getErrors(): string[] {
    return this.records
      .filter(x => x.type === LogType.ERROR)
      .map(x => x.message);
  }

  getInfo(): string[] {
    return this.records
      .filter(x => x.type === LogType.INFO)
      .map(x => x.message);
  }

  getWarnings(): string[] {
    return this.records
      .filter(x => x.type === LogType.WARNING)
      .map(x => x.message);
  }

  format(): string {
    const lines: string[] = [];

    if (this._warnings > 0) {
      lines.push(
        `${this._warnings} ${pluralize(this._errors, 'warning', 'warnings')}:`
      );
      for (const message of this.getWarnings()) {
        lines.push('  ' + message);
      }
    } else {
      lines.push('No warnings.');
    }

    if (this._errors > 0) {
      lines.push(
        `${this._errors} ${pluralize(this._errors, 'error', 'errors')}:`
      );
      for (const message of this.getErrors()) {
        lines.push('  ' + message);
      }
    } else {
      lines.push('No errors.');
    }

    return lines.join('\n');
  }

  hasErrors() {
    return this._errors > 0;
  }
}
