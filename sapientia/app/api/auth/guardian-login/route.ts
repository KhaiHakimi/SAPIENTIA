import { endOtherSessions } from '@/features/auth/server/other-sessions.service';
import { guardianSignInSchema } from '@/features/guardians/schemas/guardians.schemas';
import { signInGuardian } from '@/features/guardians/server/guardian-auth.service';
import { guardianSessionCookie } from '@/features/guardians/server/guardian-session.service';
import { clientAddress, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/auth/guardian-login: { username, password } → 204 with the guardian session cookie, or 401 with one message for
 * every failure. A staff or pupil session open in the same browser is ended.
 */
export const POST = withApi(async (request) => {
  const input = await readJson(request, guardianSignInSchema);
  const token = await signInGuardian(input, clientAddress(request), appClock());
  const headers = new Headers();
  headers.append('Set-Cookie', guardianSessionCookie(request, token));
  for (const cleared of await endOtherSessions(request, 'guardian')) headers.append('Set-Cookie', cleared);
  return new Response(null, { status: 204, headers });
});
