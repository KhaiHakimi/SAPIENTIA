import { signInSchema } from '@/features/auth/schemas/auth.schemas';
import { sessionCookie } from '@/features/auth/server/session.service';
import { signIn } from '@/features/auth/server/sign-in.service';
import { STUDENT_SESSION_COOKIE } from '@/features/students/constants/students.constants';
import { clearedStudentSessionCookie, revokeStudentSession } from '@/features/students/server/student-session.service';
import { clientAddress, readCookie, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { getPool } from '@/shared/server/database.service';

/**
 * POST /api/auth/login: { email, password } → 204 with the session cookie, or 401 with one message for every failure. A pupil
 * session open in the same browser is ended, so staff on a shared computer never act inside a pupil's session.
 */
export const POST = withApi(async (request) => {
  const input = await readJson(request, signInSchema);
  const token = await signIn(input, clientAddress(request), appClock());
  const pupilToken = readCookie(request, STUDENT_SESSION_COOKIE);
  if (pupilToken) await revokeStudentSession(getPool(), pupilToken);
  const headers = new Headers();
  headers.append('Set-Cookie', sessionCookie(request, token));
  if (pupilToken) headers.append('Set-Cookie', clearedStudentSessionCookie(request));
  return new Response(null, { status: 204, headers });
});
