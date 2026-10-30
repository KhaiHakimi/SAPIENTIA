import { requireUser } from '@/features/auth/server/current-user.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/me: the signed-in staff member, or 401. */
export const GET = withApi(async (request) => {
  const user = await requireUser(request, appClock());
  return Response.json({ user });
});
