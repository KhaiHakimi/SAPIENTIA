import 'server-only';
import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * argon2id with the OWASP Password Storage Cheat Sheet's first option (19 MiB, 2 passes, 1 lane), stored as a PHC string so
 * the parameters can be raised later without breaking existing hashes. Uses Node's built-in argon2 (Node 24.7 or later).
 */
const PARAMS = { memory: 19_456, passes: 2, parallelism: 1, tagLength: 32 } as const;
const SALT_BYTES = 16;

function derive(password: string, salt: Buffer, params: { memory: number; passes: number; parallelism: number; tagLength: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    argon2('argon2id', { message: password, nonce: salt, ...params }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

const b64 = (bytes: Buffer) => bytes.toString('base64').replace(/=+$/, '');

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, PARAMS);
  return `$argon2id$v=19$m=${PARAMS.memory},t=${PARAMS.passes},p=${PARAMS.parallelism}$${b64(salt)}$${b64(key)}`;
}

const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

/** False for a wrong password or a hash it cannot read; never throws for bad input. */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const match = PHC.exec(stored);
  if (!match) return false;
  const [, memory, passes, parallelism, salt, hash] = match;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'), {
    memory: Number(memory),
    passes: Number(passes),
    parallelism: Number(parallelism),
    tagLength: expected.length,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Verified against when the email is unknown, so a miss takes as long as a wrong password and timing reveals nothing.
let dummyHash: Promise<string> | undefined;
export function timingDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  return dummyHash;
}
