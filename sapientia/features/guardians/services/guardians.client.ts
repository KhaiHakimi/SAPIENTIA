import { apiFetch } from '@/shared/api/api-client';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type {
  AddGuardianRequest,
  AddGuardianResult,
  AddLinkRequest,
  GuardianSlip,
  LinkRemovalReason,
  SchoolGuardian,
  UpdateGuardianRequest,
} from '../interfaces/guardian.interface';

/** The administrator's side of guardians. */

export const GUARDIANS_KEY = ['guardians'] as const;

const path = (id: string) => `/api/guardians/${encodeURIComponent(id)}`;

export function fetchGuardiansPage(cursor: string | null): Promise<Page<SchoolGuardian>> {
  const query = new URLSearchParams({ limit: '25' });
  if (cursor) query.set('cursor', cursor);
  return apiFetch(`/api/guardians?${query.toString()}`);
}

export function addGuardian(input: AddGuardianRequest): Promise<AddGuardianResult> {
  return apiFetch('/api/guardians', { method: 'POST', body: input });
}

export function updateGuardian(id: string, input: UpdateGuardianRequest): Promise<SchoolGuardian> {
  return apiFetch(path(id), { method: 'PATCH', body: input });
}

export function removeGuardian(id: string): Promise<void> {
  return apiFetch(path(id), { method: 'DELETE' });
}

export function resetGuardianPassword(id: string): Promise<GuardianSlip> {
  return apiFetch(`${path(id)}/password-reset`, { method: 'POST' });
}

export function addGuardianLink(id: string, input: AddLinkRequest): Promise<SchoolGuardian> {
  return apiFetch(`${path(id)}/links`, { method: 'POST', body: input });
}

export function removeGuardianLink(id: string, linkId: string, reason: LinkRemovalReason): Promise<SchoolGuardian> {
  return apiFetch(`${path(id)}/links/${encodeURIComponent(linkId)}`, { method: 'PATCH', body: { reason } });
}
