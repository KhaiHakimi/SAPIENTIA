import 'server-only';
import { randomInt } from 'node:crypto';
import {
  STARTING_PASSWORD_ALPHABET,
  STARTING_PASSWORD_GROUP_LENGTH,
  STARTING_PASSWORD_GROUPS,
  USERNAME_DIGITS,
  USERNAME_FALLBACK_STEM,
  USERNAME_STEM_MAX,
} from '../constants/students.constants';

/** Returns a whole number from 0 up to (not including) max. Tests pass a fixed sequence; the app uses crypto.randomInt. */
export type RandomInt = (max: number) => number;

const secureRandom: RandomInt = (max) => randomInt(max);

/**
 * The letters of the first name, without accents, in lower case, at most 12: "Nur'Aisyah binti Ali" → "nuraisyah". A first
 * name with no Latin letters falls back to "murid"; the slip always carries the full name.
 */
export function usernameStem(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const letters = first.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');
  return (letters || USERNAME_FALLBACK_STEM).slice(0, USERNAME_STEM_MAX);
}

/** A username for a pupil: the stem plus four random digits. Uniqueness is the database's job; callers retry on a clash. */
export function generateUsername(name: string, random: RandomInt = secureRandom): string {
  const digits = String(random(10 ** USERNAME_DIGITS)).padStart(USERNAME_DIGITS, '0');
  return `${usernameStem(name)}${digits}`;
}

/** A starting password for a slip, such as "k7mp-x3ra", from characters that cannot be misread on paper. */
export function generateStartingPassword(random: RandomInt = secureRandom): string {
  const groups: string[] = [];
  for (let group = 0; group < STARTING_PASSWORD_GROUPS; group += 1) {
    let text = '';
    for (let index = 0; index < STARTING_PASSWORD_GROUP_LENGTH; index += 1) {
      text += STARTING_PASSWORD_ALPHABET[random(STARTING_PASSWORD_ALPHABET.length)];
    }
    groups.push(text);
  }
  return groups.join('-');
}
