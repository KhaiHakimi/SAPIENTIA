import { requireUser } from '@/features/auth/server/current-user.service';
import { addGuardianSchema } from '@/features/guardians/schemas/guardians.schemas';
import { addGuardian, listSchoolGuardians } from '@/features/guardians/server/guardians.service';
import { readJson, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';
import { pageQuerySchema } from '@/shared/server/pagination';

/** GET /api/guardians?limit=&cursor=: the school's guardians by name, with their links. Administrators only; others get 404. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const { limit, cursor } = readQuery(request, pageQuerySchema);
  return Response.json(await listSchoolGuardians(actor, limit, cursor));
});

/**
 * POST /api/guardians: { name, studentId, relationship } → 201 with the guardian and their slip. The starting password is in
 * this response only. Administrators only.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const input = await readJson(request, addGuardianSchema);
  return Response.json(await addGuardian(actor, input, appClock()), { status: 201 });
});
