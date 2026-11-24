import { apiFetch } from '@/shared/api/api-client';
import type { MfaRecoveryCodes, MfaRequirementRequest, MfaSetup, MfaSignInRequest, MfaStatus } from '../interfaces/mfa.interface';

/** The browser side of two-step sign-in. Every secret stays in an HttpOnly cookie or on the server. */

export const MFA_STATUS_KEY = ['me', 'mfa'] as const;

export function fetchMfaStatus(): Promise<MfaStatus> {
  return apiFetch('/api/me/mfa');
}

export function startMfaSetup(password: string): Promise<MfaSetup> {
  return apiFetch('/api/me/mfa/setup', { method: 'POST', body: { password } });
}

export function confirmMfaSetup(code: string): Promise<MfaRecoveryCodes> {
  return apiFetch('/api/me/mfa/confirm', { method: 'POST', body: { code } });
}

export function replaceRecoveryCodes(password: string): Promise<MfaRecoveryCodes> {
  return apiFetch('/api/me/mfa/recovery-codes', { method: 'POST', body: { password } });
}

export function disableMfa(password: string): Promise<void> {
  return apiFetch('/api/me/mfa', { method: 'DELETE', body: { password } });
}

export function setAdminMfaRequirement(input: MfaRequirementRequest): Promise<MfaStatus> {
  return apiFetch('/api/school/mfa', { method: 'PUT', body: input });
}

/** Clears a colleague's authenticator; the administrator's own password is asked for again. */
export function resetUserMfa(userId: string, password: string): Promise<void> {
  return apiFetch(`/api/users/${encodeURIComponent(userId)}/mfa`, { method: 'DELETE', body: { password } });
}

/** The code step after the password; the challenge cookie identifies the sign-in. */
export function finishMfaSignIn(input: MfaSignInRequest): Promise<void> {
  return apiFetch('/api/auth/mfa', { method: 'POST', body: input });
}
