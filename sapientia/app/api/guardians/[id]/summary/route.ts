import { requireUser } from '@/features/auth/server/current-user.service';
import { guardianIdSchema } from '@/features/guardians/schemas/guardians.schemas';
import { getGuardianSummary } from '@/features/guardians/server/guardian-summary.service';
import { classWeekQuerySchema } from '@/features/timetable/schemas/timetable.schemas';
import { NotFoundError } from '@/shared/server/app-errors';
import { readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * GET /api/guardians/:id/summary?weekOf=: the printable summary for a guardian without a smartphone. Each linked child's class
 * homework for the next two weeks (no hand-ins) and one week's timetable. Administrators only; each view is audited.
 */
export const GET = withApi(async (request, context: RouteContext<'/api/guardians/[id]/summary'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const id = guardianIdSchema.safeParse((await context.params).id);
  if (!id.success) throw new NotFoundError();
  const { weekOf } = readQuery(request, classWeekQuerySchema);
  return Response.json(await getGuardianSummary(actor, id.data, weekOf, appClock()));
});
