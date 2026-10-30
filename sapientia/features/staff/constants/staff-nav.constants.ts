import type { StaffRole } from '@/features/auth/interfaces/session-user.interface';

export type StaffNavKey = 'board' | 'users';

export interface StaffNavItem {
  key: StaffNavKey;
  href: string;
  roles: readonly StaffRole[];
}

/** The menu shows only what the role may use; the API refuses the rest anyway. */
export const STAFF_NAV: readonly StaffNavItem[] = [
  { key: 'board', href: '/staff', roles: ['admin', 'sender', 'teacher'] },
  { key: 'users', href: '/staff/users', roles: ['admin'] },
];
