import { requireUser } from '@/features/auth/server/current-user.service';
import { readItemId, readKind } from '@/features/school-data/server/school-data-route.helpers';
import { removeSchoolData } from '@/features/school-data/server/school-data.service';
import { withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * DELETE /api/school-data/:kind/:id: administrators only. A subject or class still on a timetable answers 409; a task type
 * is archived, so tasks already sent keep it.
 */
export const DELETE = withApi(async (request, context: RouteContext<'/api/school-data/[kind]/[id]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const params = await context.params;
  await removeSchoolData(actor, readKind(params), readItemId(params), appClock());
  return new Response(null, { status: 204 });
});
