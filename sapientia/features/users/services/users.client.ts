import { apiFetch } from '@/shared/api/api-client';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type {
  InviteUserRequest,
  InviteUserResult,
  StaffMember,
  StaffUser,
  UpdateUserStatusRequest,
} from '../interfaces/staff-user.interface';

export const USERS_KEY = ['users'] as const;
export const STAFF_DIRECTORY_KEY = ['staff'] as const;

export function fetchUsersPage(cursor: string | null): Promise<Page<StaffUser>> {
  return apiFetch(`/api/users?limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
}

export function inviteUser(input: InviteUserRequest): Promise<InviteUserResult> {
  return apiFetch('/api/users', { method: 'POST', body: input });
}

export async function fetchStaffDirectory(): Promise<StaffMember[]> {
  return (await apiFetch<{ items: StaffMember[] }>('/api/staff')).items;
}

export function updateUserStatus(id: string, input: UpdateUserStatusRequest): Promise<StaffUser> {
  return apiFetch(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
}

export function removeUser(id: string): Promise<void> {
  return apiFetch(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
