import { GUARDIAN_SESSION_COOKIE } from '@/features/guardians/constants/guardians.constants';
import { clearedGuardianSessionCookie, revokeGuardianSession } from '@/features/guardians/server/guardian-session.service';
import { readCookie, withApi } from '@/shared/server/api-handler';
import { getPool } from '@/shared/server/database.service';

/** POST /api/auth/guardian-logout: ends the guardian session on the server and clears the cookie. Always 204. */
export const POST = withApi(async (request) => {
  const token = readCookie(request, GUARDIAN_SESSION_COOKIE);
  if (token) await revokeGuardianSession(getPool(), token);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': clearedGuardianSessionCookie(request) } });
});
