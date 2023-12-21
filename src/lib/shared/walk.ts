import fs from 'fs';
import path from 'path';

export async function* walk(dir: string): AsyncGenerator<string> {
  const files = await fs.promises.readdir(dir);
  for (const f of files) {
    const entry = path.posix.join(dir, f);
    const stat = await fs.promises.stat(entry);
    if (stat.isDirectory()) yield* walk(entry);
    else if (stat.isFile()) yield path.join(dir, f);
  }
}

export async function filesFromFolder(folderPath: string): Promise<string[]> {
  const files: string[] = [];
  for await (const file of walk(folderPath)) {
    files.push(file);
  }
  return files;
}
