import type { CurrentGuardian } from '@/features/guardians/interfaces/guardian.interface';
import { requireGuardian } from '@/features/guardians/server/current-guardian.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/guardian/me: the signed-in guardian, and whether they must still replace the slip's password. 401 otherwise. */
export const GET = withApi(async (request) => {
  const guardian = await requireGuardian(request, appClock(), { allowPasswordChange: true });
  const { id, name, schoolName, timeZone, username } = guardian;
  const body: CurrentGuardian = { guardian: { id, name, schoolName, timeZone, username }, mustChangePassword: guardian.mustChangePassword };
  return Response.json(body);
});
