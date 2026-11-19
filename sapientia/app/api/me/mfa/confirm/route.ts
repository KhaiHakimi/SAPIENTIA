import { requireUserAllowingMfaSetup } from '@/features/auth/server/current-user.service';
import { mfaCodeRequestSchema } from '@/features/mfa/schemas/mfa.schemas';
import { confirmMfaSetup } from '@/features/mfa/server/mfa.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** POST /api/me/mfa/confirm: { code } → 200 { recoveryCodes }. The first code turns it on; the codes are shown only now. */
export const POST = withApi(async (request) => {
  const actor = await requireUserAllowingMfaSetup(request, appClock());
  const { code } = await readJson(request, mfaCodeRequestSchema);
  return Response.json(await confirmMfaSetup(actor, code, appClock()), { headers: { 'Cache-Control': 'no-store' } });
});
