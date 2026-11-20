import { signInSchema } from '@/features/auth/schemas/auth.schemas';
import { endOtherSessions } from '@/features/auth/server/other-sessions.service';
import { sessionCookie } from '@/features/auth/server/session.service';
import { signIn } from '@/features/auth/server/sign-in.service';
import { challengeCookie } from '@/features/mfa/server/mfa-cookie.service';
import { clientAddress, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/auth/login: { email, password } → 204 with the session cookie, or 401 with one message for every failure. For an
 * account with two-step sign-in, a correct password gives 200 { mfaRequired: true } and a five-minute challenge cookie
 * instead; POST /api/auth/mfa finishes. Once signed in, a pupil or guardian session open in the same browser is ended, so staff
 * on a shared computer never act inside one.
 */
export const POST = withApi(async (request) => {
  const input = await readJson(request, signInSchema);
  const outcome = await signIn(input, clientAddress(request), appClock());
  const headers = new Headers();
  if (outcome.kind === 'mfa') {
    headers.append('Set-Cookie', challengeCookie(request, outcome.challenge));
    return Response.json({ mfaRequired: true }, { status: 200, headers });
  }
  headers.append('Set-Cookie', sessionCookie(request, outcome.token));
  for (const cleared of await endOtherSessions(request, 'staff')) headers.append('Set-Cookie', cleared);
  return new Response(null, { status: 204, headers });
});
