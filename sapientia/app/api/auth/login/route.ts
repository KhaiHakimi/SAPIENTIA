import { signInSchema } from '@/features/auth/schemas/auth.schemas';
import { sessionCookie } from '@/features/auth/server/session.service';
import { signIn } from '@/features/auth/server/sign-in.service';
import { clientAddress, readJson, withApi } from '@/shared/server/api-handler';
import { systemClock } from '@/shared/server/clock.service';

/** POST /api/auth/login: { email, password } → 204 with the session cookie, or 401 with one message for every failure. */
export const POST = withApi(async (request) => {
  const input = await readJson(request, signInSchema);
  const token = await signIn(input, clientAddress(request), systemClock);
  return new Response(null, { status: 204, headers: { 'Set-Cookie': sessionCookie(request, token) } });
});
