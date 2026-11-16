'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { CURRENT_STUDENT_KEY, fetchCurrentStudent, signOutStudent } from '../services/student-auth.client';

/** Pages that use these hooks sit inside a QueryProvider (see app/(magic)/student/page.tsx). */

/** The signed-in pupil from the server. Without a pupil session the browser goes to /login. */
export function useCurrentStudent() {
  const router = useRouter();
  const query = useQuery({ queryKey: CURRENT_STUDENT_KEY, queryFn: fetchCurrentStudent });
  const signedOut = query.error instanceof ApiError && query.error.code === 'unauthenticated';
  useEffect(() => {
    if (signedOut) router.replace('/login');
  }, [signedOut, router]);
  return query;
}

/** Ends the pupil session on the server, forgets the pupil in this tab and goes to the sign-in page. */
export function useStudentSignOut(): () => Promise<void> {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    try {
      await signOutStudent();
    } catch (error) {
      // The cookie may still be set if the call failed; the session still ends after 30 minutes idle.
      console.error('Sign-out request failed', error);
    }
    queryClient.clear();
    router.replace('/login');
  }, [queryClient, router]);
}
