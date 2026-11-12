import type { StaffRole } from '@/features/auth/interfaces/session-user.interface';

export type StaffNavKey =
  | 'board' | 'sent' | 'held' | 'newTask' | 'timetable' | 'relief' | 'users' | 'schoolData' | 'settings' | 'calendar' | 'notifications';

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
  { key: 'timetable', href: '/staff/timetable', roles: ['admin', 'sender', 'teacher'] },
  { key: 'relief', href: '/staff/relief', roles: ['admin', 'sender', 'teacher'] },
  { key: 'users', href: '/staff/users', roles: ['admin'] },
  { key: 'schoolData', href: '/staff/school-data', roles: ['admin'] },
  { key: 'settings', href: '/staff/settings', roles: ['admin'] },
  { key: 'calendar', href: '/staff/calendar', roles: ['admin'] },
  { key: 'notifications', href: '/staff/notifications', roles: ['admin', 'sender', 'teacher'] },
];
