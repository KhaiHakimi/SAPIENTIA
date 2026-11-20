import { requireUserAllowingMfaSetup } from '@/features/auth/server/current-user.service';
import { passwordRequestSchema } from '@/features/mfa/schemas/mfa.schemas';
import { disableMyMfa, getMfaStatus } from '@/features/mfa/server/mfa.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/me/mfa: whether two-step sign-in is on, recovery codes left, and whether the school requires it. Any staff. */
export const GET = withApi(async (request) => {
  const actor = await requireUserAllowingMfaSetup(request, appClock());
  return Response.json(await getMfaStatus(actor));
});

/** DELETE /api/me/mfa: { password } → 204. Turns it off; 409 for an administrator while the school requires it. */
export const DELETE = withApi(async (request) => {
  const actor = await requireUserAllowingMfaSetup(request, appClock());
  const { password } = await readJson(request, passwordRequestSchema);
  await disableMyMfa(actor, password, appClock());
  return new Response(null, { status: 204 });
});
