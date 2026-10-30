import { SESSION_COOKIE } from '@/features/auth/constants/session.constants';
import { clearedSessionCookie, revokeSession } from '@/features/auth/server/session.service';
import { readCookie, withApi } from '@/shared/server/api-handler';
import { getPool } from '@/shared/server/database.service';

/** POST /api/auth/logout: ends the session on the server and clears the cookie. Always 204, signed in or not. */
export const POST = withApi(async (request) => {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await revokeSession(getPool(), token);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearedSessionCookie(request) } });
});
