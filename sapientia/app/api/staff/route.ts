import { requireUser } from '@/features/auth/server/current-user.service';
import { listActiveStaff } from '@/features/users/server/users.repository';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { getPool } from '@/shared/server/database.service';

/** GET /api/staff: active staff (id, name, role) for choosing assignees. Senders and administrators only. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin', 'sender']);
  return Response.json({ items: await listActiveStaff(getPool(), actor.schoolId) });
});
