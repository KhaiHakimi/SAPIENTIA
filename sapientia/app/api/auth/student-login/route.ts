import { endOtherSessions } from '@/features/auth/server/other-sessions.service';
import { studentSignInSchema } from '@/features/students/schemas/students.schemas';
import { signInStudent } from '@/features/students/server/student-auth.service';
import { studentSessionCookie } from '@/features/students/server/student-session.service';
import { clientAddress, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/auth/student-login: { username, password } → 204 with the pupil session cookie, or 401 with one message for
 * every failure. A staff or guardian session open in the same browser is ended, so a pupil on a shared computer never
 * inherits it.
 */
export const POST = withApi(async (request) => {
  const input = await readJson(request, studentSignInSchema);
  const token = await signInStudent(input, clientAddress(request), appClock());
  const headers = new Headers();
  headers.append('Set-Cookie', studentSessionCookie(request, token));
  for (const cleared of await endOtherSessions(request, 'pupil')) headers.append('Set-Cookie', cleared);
  return new Response(null, { status: 204, headers });
});
