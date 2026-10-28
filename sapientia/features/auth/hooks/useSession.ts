'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import type { DemoAccount, StudentAccount } from '../interfaces/account.interface';
import { accountById } from '../services/auth.service';
import { sessionStore } from '../services/session.store';

const subscribeNothing = () => () => {};

export interface SessionApi {
  /**
   * False during the server render and hydration, when the store still shows its default (signed out). Redirect decisions
   * wait for this, or a signed-in student would be bounced to the login page on every load.
   */
  ready: boolean;
  account: DemoAccount | null;
}

export function useSession(): SessionApi {
  const ready = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const account = accountById(usePersistentStore(sessionStore));
  return { ready, account };
}

/** The signed-in student, or null while loading; anyone else is sent to the login page. */
export function useRequireStudent(): StudentAccount | null {
  const { ready, account } = useSession();
  const router = useRouter();
  const student = account?.role === 'student' ? account : null;
  useEffect(() => {
    if (ready && !student) router.replace('/login');
  }, [ready, student, router]);
  return student;
}

export function useSignOut(): () => void {
  const router = useRouter();
  return useCallback(() => {
    sessionStore.clear();
    router.replace('/login');
  }, [router]);
}
