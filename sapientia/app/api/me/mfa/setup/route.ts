import { requireUserAllowingMfaSetup } from '@/features/auth/server/current-user.service';
import { passwordRequestSchema } from '@/features/mfa/schemas/mfa.schemas';
import { startMfaSetup } from '@/features/mfa/server/mfa.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/me/mfa/setup: { password } → 201 { key, otpauthUri }. A new secret for an authenticator app; nothing changes at
 * sign-in until POST /api/me/mfa/confirm. 409 when it is already on; 503 when the server has no encryption key.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUserAllowingMfaSetup(request, appClock());
  const { password } = await readJson(request, passwordRequestSchema);
  return Response.json(await startMfaSetup(actor, password, appClock()), { status: 201, headers: { 'Cache-Control': 'no-store' } });
});
