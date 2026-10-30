import type { StaffRole } from '@/features/auth/interfaces/session-user.interface';

export type StaffNavKey = 'board' | 'sent' | 'held' | 'newTask' | 'users' | 'settings' | 'calendar';

export interface StaffNavItem {
  key: StaffNavKey;
  href: string;
  roles: readonly StaffRole[];
}

/** The menu shows only what the role may use; the API refuses the rest anyway. */
export const STAFF_NAV: readonly StaffNavItem[] = [
  { key: 'board', href: '/staff', roles: ['admin', 'sender', 'teacher'] },
  { key: 'sent', href: '/staff/sent', roles: ['admin', 'sender'] },
  { key: 'held', href: '/staff/held', roles: ['admin', 'sender'] },
  { key: 'newTask', href: '/staff/tasks/new', roles: ['admin', 'sender'] },
  { key: 'users', href: '/staff/users', roles: ['admin'] },
  { key: 'settings', href: '/staff/settings', roles: ['admin'] },
  { key: 'calendar', href: '/staff/calendar', roles: ['admin'] },
];
