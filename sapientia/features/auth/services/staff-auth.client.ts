import type { MfaSignInRequest } from '@/features/mfa/interfaces/mfa.interface';
import { finishMfaSignIn } from '@/features/mfa/services/mfa.client';
import { apiFetch } from '@/shared/api/api-client';
import type { AcceptInviteRequest, SessionUser, SignInRequest } from '../interfaces/session-user.interface';

/** Signed in, or the password was right and the account wants a code from its authenticator app next. */
export type StaffSignInResult = { mfaRequired: false; user: SessionUser } | { mfaRequired: true };

/** Browser side of staff sign-in: the server sets the HttpOnly cookie, then /api/me says who is signed in. */
export async function signInStaff(input: SignInRequest): Promise<StaffSignInResult> {
  const body = await apiFetch<{ mfaRequired?: boolean } | undefined>('/api/auth/login', { method: 'POST', body: input });
  if (body?.mfaRequired) return { mfaRequired: true };
  return { mfaRequired: false, user: await fetchCurrentUser() };
}

/** The code step: the server checks the code against the challenge cookie and sets the session cookie. */
export async function finishStaffMfa(input: MfaSignInRequest): Promise<SessionUser> {
  await finishMfaSignIn(input);
  return fetchCurrentUser();
}

export async function fetchCurrentUser(): Promise<SessionUser> {
  return (await apiFetch<{ user: SessionUser }>('/api/me')).user;
}

export async function acceptStaffInvite(input: AcceptInviteRequest): Promise<SessionUser> {
  await apiFetch<void>('/api/auth/invites/accept', { method: 'POST', body: input });
  return fetchCurrentUser();
}

export function signOutStaff(): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST' });
}
