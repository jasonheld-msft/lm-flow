import fs from 'fs-extra';
import path from 'path';

export async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.posix.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield path.posix.join(dir, d.name);
  }
}

export async function filesFromFolder(folderPath: string): Promise<string[]> {
  const files: string[] = [];
  for await (const file of walk(folderPath)) {
    files.push(file);
  }
  return files;
}
