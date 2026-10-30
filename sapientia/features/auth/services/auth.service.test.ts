import { describe, expect, it } from 'vitest';
import { DEMO_ACCOUNTS } from '../data/demo-accounts';
import { accountById, checkLoginFields, findAccount } from './auth.service';

describe('login fields', () => {
  it('asks for both fields and a usable email', () => {
    expect(checkLoginFields('', '')).toEqual({ email: 'emailRequired', password: 'passwordRequired' });
    expect(checkLoginFields('aisyah', 'x')).toEqual({ email: 'emailInvalid' });
    expect(checkLoginFields('  aisyah@pelajar.sapientia.test ', 'x')).toEqual({});
  });
});

describe('demo sign-in', () => {
  it('finds a student by email (any case, spaces trimmed) and exact password', () => {
    const account = findAccount('  Aisyah@Pelajar.Sapientia.TEST ', 'pelajar123');
    expect(account?.id).toBe('student-aisyah');
    expect(account?.role).toBe('student');
  });

  it('rejects a wrong password or an unknown email', () => {
    expect(findAccount('aisyah@pelajar.sapientia.test', 'Pelajar123')).toBeNull();
    expect(findAccount('nobody@pelajar.sapientia.test', 'pelajar123')).toBeNull();
  });

  it('looks accounts up by id for the saved session', () => {
    expect(accountById('student-kavitha')?.role).toBe('student');
    expect(accountById('edited-in-devtools')).toBeNull();
    expect(accountById(null)).toBeNull();
  });

  it('keeps ids and emails unique, and emails lower case', () => {
    expect(new Set(DEMO_ACCOUNTS.map((account) => account.id)).size).toBe(DEMO_ACCOUNTS.length);
    expect(new Set(DEMO_ACCOUNTS.map((account) => account.email)).size).toBe(DEMO_ACCOUNTS.length);
    DEMO_ACCOUNTS.forEach((account) => expect(account.email).toBe(account.email.toLowerCase()));
  });
});
