import { requireUser } from '@/features/auth/server/current-user.service';
import { inviteUserSchema } from '@/features/users/schemas/users.schemas';
import { inviteUser, listSchoolUsers } from '@/features/users/server/users.service';
import { publicOrigin, readJson, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { pageQuerySchema } from '@/shared/server/pagination';

/** GET /api/users?limit=&cursor=: this school's accounts, by name. Administrators only; anyone else gets 404. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const { limit, cursor } = readQuery(request, pageQuerySchema);
  return Response.json(await listSchoolUsers(actor, limit, cursor));
});

/** POST /api/users: { email, name, role } → 201 with the invite link (valid 48 hours). Administrators only. */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const input = await readJson(request, inviteUserSchema);
  return Response.json(await inviteUser(actor, input, publicOrigin(request), appClock()), { status: 201 });
});
