import { SESSION_COOKIE } from '@/features/auth/constants/session.constants';
import { clearedSessionCookie, revokeSession } from '@/features/auth/server/session.service';
import { studentSignInSchema } from '@/features/students/schemas/students.schemas';
import { signInStudent } from '@/features/students/server/student-auth.service';
import { studentSessionCookie } from '@/features/students/server/student-session.service';
import { clientAddress, readCookie, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { getPool } from '@/shared/server/database.service';

/**
 * POST /api/auth/student-login: { username, password } → 204 with the pupil session cookie, or 401 with one message for
 * every failure. A staff session open in the same browser is ended, so a pupil on a shared computer never inherits it.
 */
export const POST = withApi(async (request) => {
  const input = await readJson(request, studentSignInSchema);
  const token = await signInStudent(input, clientAddress(request), appClock());
  const staffToken = readCookie(request, SESSION_COOKIE);
  if (staffToken) await revokeSession(getPool(), staffToken);
  const headers = new Headers();
  headers.append('Set-Cookie', studentSessionCookie(request, token));
  if (staffToken) headers.append('Set-Cookie', clearedSessionCookie(request));
  return new Response(null, { status: 204, headers });
});
