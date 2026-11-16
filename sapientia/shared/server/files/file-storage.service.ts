import 'server-only';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

/**
 * Where uploaded bytes live: a folder outside the web root (UPLOAD_DIR, default .data/uploads), under random 64-character
 * names that say nothing about the file. Nothing here is served directly; the files route reads through readBytes after an
 * authorisation check. On a single server only: a second server needs shared storage (hosting decision D5).
 */

const KEY = /^[0-9a-f]{64}$/;

export function uploadRoot(env: Record<string, string | undefined> = process.env): string {
  // turbopackIgnore: the folder is chosen at run time; without it the build would trace the whole project into the server output.
  const root = resolve(/*turbopackIgnore: true*/ env.UPLOAD_DIR?.trim() || '.data/uploads');
  // Never inside public/, where Next.js would serve the files to anyone.
  const fromPublic = relative(resolve(/*turbopackIgnore: true*/ 'public'), root);
  // On Windows a folder on another drive comes back as an absolute path: that is outside public/ too.
  const inside = fromPublic === '' || (!fromPublic.startsWith('..') && !isAbsolute(fromPublic));
  if (inside) throw new Error('UPLOAD_DIR must not be inside public/.');
  return root;
}

/** The key is checked before it becomes a path, so no stored value can reach outside the upload folder. */
function pathOf(key: string): string {
  if (!KEY.test(key)) throw new Error('Not a storage key.');
  return join(/*turbopackIgnore: true*/ uploadRoot(), key.slice(0, 2), key);
}

/** Writes new bytes under a fresh random key and returns the key. Never overwrites an existing file. */
export async function saveBytes(bytes: Uint8Array): Promise<string> {
  const key = randomBytes(32).toString('hex');
  const path = pathOf(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
  return key;
}

export async function readBytes(key: string): Promise<Buffer> {
  return readFile(pathOf(key));
}

/** Removes a file; one that is already gone is fine. */
export async function removeBytes(key: string): Promise<void> {
  await rm(pathOf(key), { force: true });
}
