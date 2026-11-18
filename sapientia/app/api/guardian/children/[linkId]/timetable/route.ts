import { linkIdSchema } from '@/features/guardians/schemas/guardians.schemas';
import { requireGuardian } from '@/features/guardians/server/current-guardian.service';
import { getChildWeek } from '@/features/guardians/server/guardian-view.service';
import { classWeekQuerySchema } from '@/features/timetable/schemas/timetable.schemas';
import { NotFoundError } from '@/shared/server/app-errors';
import { readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/guardian/children/:linkId/timetable?weekOf=: a linked child's class week, relief marked. 404 for any other link. */
export const GET = withApi(async (request, context: RouteContext<'/api/guardian/children/[linkId]/timetable'>) => {
  const guardian = await requireGuardian(request, appClock());
  const linkId = linkIdSchema.safeParse((await context.params).linkId);
  if (!linkId.success) throw new NotFoundError();
  const { weekOf } = readQuery(request, classWeekQuerySchema);
  return Response.json(await getChildWeek(guardian, linkId.data, weekOf, appClock()));
});
