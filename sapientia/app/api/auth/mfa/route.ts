import { endOtherSessions } from '@/features/auth/server/other-sessions.service';
import { sessionCookie } from '@/features/auth/server/session.service';
import { MFA_CHALLENGE_COOKIE } from '@/features/mfa/constants/mfa.constants';
import { mfaSignInSchema } from '@/features/mfa/schemas/mfa.schemas';
import { clearedChallengeCookie } from '@/features/mfa/server/mfa-cookie.service';
import { completeChallenge } from '@/features/mfa/server/mfa-sign-in.service';
import { UnauthenticatedError } from '@/shared/server/app-errors';
import { clientAddress, readCookie, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/auth/mfa: { code } or { recoveryCode }, after POST /api/auth/login said mfaRequired → 204 with the session cookie.
 * 400 wrong_code for a wrong code; 401 when the challenge is missing, expired or used up (sign in again).
 */
export const POST = withApi(async (request) => {
  const token = readCookie(request, MFA_CHALLENGE_COOKIE);
  if (!token) throw new UnauthenticatedError();
  const input = await readJson(request, mfaSignInSchema);
  const session = await completeChallenge(token, input, clientAddress(request), appClock());
  const headers = new Headers();
  headers.append('Set-Cookie', sessionCookie(request, session));
  headers.append('Set-Cookie', clearedChallengeCookie(request));
  for (const cleared of await endOtherSessions(request, 'staff')) headers.append('Set-Cookie', cleared);
  return new Response(null, { status: 204, headers });
});
