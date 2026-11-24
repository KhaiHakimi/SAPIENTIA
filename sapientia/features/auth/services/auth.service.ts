import { GUARDIAN_USERNAME_PREFIX } from '@/features/guardians/constants/guardians.constants';
import { ApiError } from '@/shared/api/api-client';
import type { LoginFailureReason, LoginFieldErrors } from '../interfaces/account.interface';

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

/**
 * The login form's own reason for a failed sign-in, or null when the shared error texts should describe it. Only the
 * server's invalid_credentials means a wrong email or password: a server fault or a refused request must not send the
 * person off retyping a password that was right.
 */
export function loginFailureReason(error: unknown): LoginFailureReason | null {
  if (!(error instanceof ApiError) || error.code === 'network') return 'networkError';
  if (error.code === 'rate_limited') return 'rateLimited';
  if (error.code === 'invalid_credentials') return 'badCredentials';
  return null;
}
