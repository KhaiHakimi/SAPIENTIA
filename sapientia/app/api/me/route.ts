import { requireUserAllowingMfaSetup } from '@/features/auth/server/current-user.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/me: the signed-in staff member, or 401. mfaSetupRequired tells the web app to open the setup first. */
export const GET = withApi(async (request) => {
  const user = await requireUserAllowingMfaSetup(request, appClock());
  return Response.json({ user });
});
