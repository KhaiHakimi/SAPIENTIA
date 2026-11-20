import { acceptInviteSchema } from '@/features/auth/schemas/auth.schemas';
import { sessionCookie } from '@/features/auth/server/session.service';
import { acceptInvite } from '@/features/auth/server/sign-in.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** POST /api/auth/invites/accept: { token, password } → 204 and signed in; 404 for a used, expired or unknown link. */
export const POST = withApi(async (request) => {
  const input = await readJson(request, acceptInviteSchema);
  const token = await acceptInvite(input, appClock());
  return new Response(null, { status: 204, headers: { 'Set-Cookie': sessionCookie(request, token) } });
});
