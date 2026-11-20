'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { openSignInPage } from '@/shared/services/sign-in-page.service';
import { CURRENT_STUDENT_KEY, fetchCurrentStudent, signOutStudent } from '../services/student-auth.client';

/** Pages that use these hooks sit inside a QueryProvider (see app/(magic)/student/page.tsx). */

/** The signed-in pupil from the server. Without a pupil session the browser goes to /login. */
export function useCurrentStudent() {
  const query = useQuery({ queryKey: CURRENT_STUDENT_KEY, queryFn: fetchCurrentStudent });
  // Any 401, whatever its code, means no pupil session, as StaffShell treats staff (403 is the slip-password step).
  const signedOut = query.error instanceof ApiError && query.error.status === 401;
  useEffect(() => {
    if (signedOut) openSignInPage();
  }, [signedOut]);
  return query;
}

/** Ends the pupil session on the server, then loads a fresh sign-in page, which also forgets everything held in this tab. */
export function useStudentSignOut(): () => Promise<void> {
  return useCallback(async () => {
    try {
      await signOutStudent();
    } catch (error) {
      // The cookie may still be set if the call failed; the session still ends after 30 minutes idle.
      console.error('Sign-out request failed', error);
    }
    openSignInPage();
  }, []);
}
