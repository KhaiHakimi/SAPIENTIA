'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { fetchCurrentUser } from '@/features/auth/services/staff-auth.client';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';

export const CURRENT_USER_KEY = ['me'] as const;

export function useCurrentUserQuery() {
  return useQuery({ queryKey: CURRENT_USER_KEY, queryFn: fetchCurrentUser, staleTime: 5 * 60_000 });
}

export const StaffUserContext = createContext<SessionUser | null>(null);

/** The signed-in staff member inside the staff shell (which only renders its pages once this is known). */
export function useStaffUser(): SessionUser {
  const user = useContext(StaffUserContext);
  if (!user) throw new Error('useStaffUser is only available inside StaffShell.');
  return user;
}
