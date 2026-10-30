import { apiFetch } from '@/shared/api/api-client';
import type { AcceptInviteRequest, SessionUser, SignInRequest } from '../interfaces/session-user.interface';

/** Browser side of staff sign-in: the server sets the HttpOnly cookie, then /api/me says who is signed in. */
export async function signInStaff(input: SignInRequest): Promise<SessionUser> {
  await apiFetch<void>('/api/auth/login', { method: 'POST', body: input });
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
