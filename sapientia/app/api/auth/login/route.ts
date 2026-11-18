import { signInSchema } from '@/features/auth/schemas/auth.schemas';
import { endOtherSessions } from '@/features/auth/server/other-sessions.service';
import { sessionCookie } from '@/features/auth/server/session.service';
import { signIn } from '@/features/auth/server/sign-in.service';
import { clientAddress, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/auth/login: { email, password } → 204 with the session cookie, or 401 with one message for every failure. A pupil
 * or guardian session open in the same browser is ended, so staff on a shared computer never act inside one.
 */
export const POST = withApi(async (request) => {
  const input = await readJson(request, signInSchema);
  const token = await signIn(input, clientAddress(request), appClock());
  const headers = new Headers();
  headers.append('Set-Cookie', sessionCookie(request, token));
  for (const cleared of await endOtherSessions(request, 'staff')) headers.append('Set-Cookie', cleared);
  return new Response(null, { status: 204, headers });
});
