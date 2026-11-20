import { describe, expect, it } from 'vitest';
import { STARTING_PASSWORD_ALPHABET } from '../constants/students.constants';
import { generateStartingPassword, generateUsername, usernameStem } from './student-credentials.service';

/** Plays back fixed numbers, wrapping round, so the output is predictable. */
const sequence = (...values: number[]) => {
  let index = 0;
  return (max: number) => {
    const value = values[index % values.length];
    index += 1;
    if (value >= max) throw new Error(`${value} is not below ${max}`);
    return value;
  };
};

describe('usernameStem', () => {
  it.each([
    ['Aisyah binti Rahman', 'aisyah'],
    ["Nur'Aisyah Ali", 'nuraisyah'],
    ['  Zoë   Tan ', 'zoe'],
    ['Muhammadabdullahhakim bin Ali', 'muhammadabdu'],
    ['陈伟', 'murid'],
    ['குமார்', 'murid'],
    ['', 'murid'],
  ])('%s → %s', (name, stem) => {
    expect(usernameStem(name)).toBe(stem);
  });
});

describe('generateUsername', () => {
  it('adds four digits, padded with zeros', () => {
    expect(generateUsername('Daniel Lee', sequence(42))).toBe('daniel0042');
  });

  it('always matches the database rule', () => {
    for (const name of ['Ah Kow', '陈伟', 'Ravi', "D'Souza Maria"]) {
      expect(generateUsername(name)).toMatch(/^[a-z][a-z0-9]{2,31}$/);
    }
  });
});

describe('generateStartingPassword', () => {
  it('is two groups of four from the unambiguous alphabet', () => {
    expect(generateStartingPassword(sequence(0, 1, 2, 3, 30, 29, 28, 27))).toBe('abcd-9876');
  });

  it('never uses characters that are easy to misread', () => {
    for (let run = 0; run < 200; run += 1) {
      const password = generateStartingPassword();
      expect(password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
      expect(password).not.toMatch(/[01ilo]/);
      for (const character of password.replace('-', '')) expect(STARTING_PASSWORD_ALPHABET).toContain(character);
    }
  });
});
