import { DEMO_ACCOUNTS } from '../data/demo-accounts';
import type { DemoAccount, LoginFieldErrors } from '../interfaces/account.interface';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkLoginFields(email: string, password: string): LoginFieldErrors {
  const trimmed = email.trim();
  const errors: LoginFieldErrors = {};
  if (!trimmed) errors.email = 'emailRequired';
  else if (!EMAIL_PATTERN.test(trimmed)) errors.email = 'emailInvalid';
  if (!password) errors.password = 'passwordRequired';
  return errors;
}

/** Email is matched without case or surrounding spaces; the password must match exactly. */
export function findAccount(email: string, password: string, accounts: readonly DemoAccount[] = DEMO_ACCOUNTS): DemoAccount | null {
  const wanted = email.trim().toLowerCase();
  return accounts.find((account) => account.email === wanted && account.password === password) ?? null;
}

export function accountName(account: DemoAccount): string {
  return account.student.name;
}

export function accountById(id: string | null, accounts: readonly DemoAccount[] = DEMO_ACCOUNTS): DemoAccount | null {
  if (!id) return null;
  return accounts.find((account) => account.id === id) ?? null;
}
