import { createHash, randomInt } from 'node:crypto';

/**
 * Recovery codes: ten characters from an alphabet without look-alikes (no 0/o, 1/l/i), shown as "abcde-fghjk". About 49 bits
 * each, enough that a fast hash (SHA-256) is safe to store; a slow one would add nothing.
 */

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const LENGTH = 10;

export function generateRecoveryCode(random: (max: number) => number = randomInt): string {
  let code = '';
  for (let index = 0; index < LENGTH; index += 1) code += ALPHABET[random(ALPHABET.length)];
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/** The same hash however the person typed it: case, spaces and the dash do not matter. */
export function hashRecoveryCode(code: string): Buffer {
  return createHash('sha256').update(code.toLowerCase().replace(/[\s-]/g, '')).digest();
}
