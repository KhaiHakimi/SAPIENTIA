import { requireGuardian } from '@/features/guardians/server/current-guardian.service';
import { listGuardianChildren } from '@/features/guardians/server/guardian-view.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/guardian/children: the signed-in guardian's linked children and their homework, read only. Guardians only. */
export const GET = withApi(async (request) => {
  const guardian = await requireGuardian(request, appClock());
  return Response.json(await listGuardianChildren(guardian, appClock()));
});
