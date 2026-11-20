import { GUARDIAN_USERNAME_PREFIX } from '@/features/guardians/constants/guardians.constants';
import type { LoginFieldErrors } from '../interfaces/account.interface';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Staff sign in with an email; pupils with the username on their slip, which never contains "@". */
export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes('@');
}

/** Guardian usernames all start with this (see features/guardians); pupils' never contain a dot. */
export function isGuardianIdentifier(identifier: string): boolean {
  return identifier.toLowerCase().startsWith(GUARDIAN_USERNAME_PREFIX);
}

export function checkLoginFields(identifier: string, password: string): LoginFieldErrors {
  const trimmed = identifier.trim();
  const errors: LoginFieldErrors = {};
  if (!trimmed) errors.identifier = 'identifierRequired';
  else if (isEmailIdentifier(trimmed) && !EMAIL_PATTERN.test(trimmed)) errors.identifier = 'emailInvalid';
  if (!password) errors.password = 'passwordRequired';
  return errors;
}
