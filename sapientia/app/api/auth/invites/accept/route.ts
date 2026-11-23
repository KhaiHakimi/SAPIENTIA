import { acceptInviteSchema } from '@/features/auth/schemas/auth.schemas';
import { endOtherSessions } from '@/features/auth/server/other-sessions.service';
import { sessionCookie } from '@/features/auth/server/session.service';
import { acceptInvite } from '@/features/auth/server/sign-in.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/auth/invites/accept: { token, password } → 204 and signed in; 404 for a used, expired or unknown link. As with
 * signing in, a pupil or guardian session open in the same browser is ended.
 */
export const POST = withApi(async (request) => {
  const input = await readJson(request, acceptInviteSchema);
  const token = await acceptInvite(input, appClock());
  const headers = new Headers();
  headers.append('Set-Cookie', sessionCookie(request, token));
  for (const cleared of await endOtherSessions(request, 'staff')) headers.append('Set-Cookie', cleared);
  return new Response(null, { status: 204, headers });
});
