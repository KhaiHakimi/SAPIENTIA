import { STUDENT_SESSION_COOKIE } from '@/features/students/constants/students.constants';
import { clearedStudentSessionCookie, revokeStudentSession } from '@/features/students/server/student-session.service';
import { readCookie, withApi } from '@/shared/server/api-handler';
import { getPool } from '@/shared/server/database.service';

/** POST /api/auth/student-logout: ends the pupil session on the server and clears the cookie. Always 204. */
export const POST = withApi(async (request) => {
  const token = readCookie(request, STUDENT_SESSION_COOKIE);
  if (token) await revokeStudentSession(getPool(), token);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearedStudentSessionCookie(request) } });
});
