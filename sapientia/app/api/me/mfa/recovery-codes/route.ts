import { requireUser } from '@/features/auth/server/current-user.service';
import { passwordRequestSchema } from '@/features/mfa/schemas/mfa.schemas';
import { replaceMyRecoveryCodes } from '@/features/mfa/server/mfa.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** POST /api/me/mfa/recovery-codes: { password } → 200 { recoveryCodes }. New codes, shown once; the old ones stop working. */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const { password } = await readJson(request, passwordRequestSchema);
  return Response.json(await replaceMyRecoveryCodes(actor, password, appClock()), { headers: { 'Cache-Control': 'no-store' } });
});
