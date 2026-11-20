import { apiFetch } from '@/shared/api/api-client';
import type { ClassWeek } from '@/features/timetable/interfaces/timetable.interface';
import type {
  ChangeGuardianPasswordRequest,
  CurrentGuardian,
  GuardianChildren,
  GuardianSignInRequest,
  LinkRefusalReason,
} from '../interfaces/guardian.interface';

/** The guardian's own side: sign-in, password, and the read-only view. The server sets the HttpOnly guardian cookie. */

export const CURRENT_GUARDIAN_KEY = ['guardian', 'me'] as const;
export const GUARDIAN_CHILDREN_KEY = ['guardian', 'children'] as const;
export const childWeekKey = (linkId: string, monday: string) => ['guardian', 'week', linkId, monday] as const;

export async function signInGuardian(input: GuardianSignInRequest): Promise<CurrentGuardian> {
  await apiFetch<void>('/api/auth/guardian-login', { method: 'POST', body: input });
  return fetchCurrentGuardian();
}

export function fetchCurrentGuardian(): Promise<CurrentGuardian> {
  return apiFetch('/api/guardian/me');
}

export function changeGuardianPassword(input: ChangeGuardianPasswordRequest): Promise<void> {
  return apiFetch('/api/guardian/password', { method: 'PUT', body: input });
}

export function signOutGuardian(): Promise<void> {
  return apiFetch('/api/auth/guardian-logout', { method: 'POST' });
}

export function fetchGuardianChildren(): Promise<GuardianChildren> {
  return apiFetch('/api/guardian/children');
}

export function fetchChildWeek(linkId: string, monday: string): Promise<ClassWeek> {
  return apiFetch(`/api/guardian/children/${encodeURIComponent(linkId)}/timetable?weekOf=${encodeURIComponent(monday)}`);
}

export function refuseLink(linkId: string, reason: LinkRefusalReason): Promise<void> {
  return apiFetch(`/api/guardian/links/${encodeURIComponent(linkId)}/refusal`, { method: 'POST', body: { reason } });
}
