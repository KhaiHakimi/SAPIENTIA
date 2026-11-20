import { changeGuardianPasswordSchema } from '@/features/guardians/schemas/guardians.schemas';
import { changeGuardianPassword } from '@/features/guardians/server/guardian-auth.service';
import { guardianSessionCookie } from '@/features/guardians/server/guardian-session.service';
import { requireGuardian } from '@/features/guardians/server/current-guardian.service';
import { clientAddress, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * PUT /api/guardian/password: { currentPassword, newPassword } → 204 with a fresh session cookie. The guardian's other
 * sessions end. Allowed while the slip's password is still in use, since this is how it is replaced.
 */
export const PUT = withApi(async (request) => {
  const guardian = await requireGuardian(request, appClock(), { allowPasswordChange: true });
  const input = await readJson(request, changeGuardianPasswordSchema);
  const token = await changeGuardianPassword(guardian, input, clientAddress(request), appClock());
  return new Response(null, { status: 204, headers: { 'Set-Cookie': guardianSessionCookie(request, token) } });
});
