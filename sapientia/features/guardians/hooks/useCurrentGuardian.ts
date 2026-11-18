'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { openSignInPage } from '@/shared/services/sign-in-page.service';
import { CURRENT_GUARDIAN_KEY, fetchCurrentGuardian, signOutGuardian } from '../services/guardian-auth.client';

/** The signed-in guardian from the server. Without a guardian session the browser goes to the sign-in page (a full load). */
export function useCurrentGuardian() {
  const query = useQuery({ queryKey: CURRENT_GUARDIAN_KEY, queryFn: fetchCurrentGuardian });
  const signedOut = query.error instanceof ApiError && query.error.status === 401;
  useEffect(() => {
    if (signedOut) openSignInPage();
  }, [signedOut]);
  return query;
}

/** Ends the guardian session on the server, then loads a fresh sign-in page, which also forgets everything held in this tab. */
export function useGuardianSignOut(): () => Promise<void> {
  return useCallback(async () => {
    try {
      await signOutGuardian();
    } catch (error) {
      // The cookie may still be set if the call failed; the session still ends after 60 minutes idle.
      console.error('Sign-out request failed', error);
    }
    openSignInPage();
  }, []);
}
