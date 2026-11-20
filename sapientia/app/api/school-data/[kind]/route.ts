import { requireUser } from '@/features/auth/server/current-user.service';
import { namedItemSchema, taskTypeSchema } from '@/features/school-data/schemas/school-data.schemas';
import { readKind } from '@/features/school-data/server/school-data-route.helpers';
import { addSchoolData, listSchoolData } from '@/features/school-data/server/school-data.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/school-data/:kind (subjects, classes or task-types): the school's list, for any signed-in staff member. */
export const GET = withApi(async (request, context: RouteContext<'/api/school-data/[kind]'>) => {
  const actor = await requireUser(request, appClock());
  const kind = readKind(await context.params);
  return Response.json({ items: await listSchoolData(actor, kind) });
});

/** POST /api/school-data/:kind: { name }, plus { estimatedMinutes } for task-types. Administrators only. */
export const POST = withApi(async (request, context: RouteContext<'/api/school-data/[kind]'>) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const kind = readKind(await context.params);
  const input = await readJson(request, kind === 'task-types' ? taskTypeSchema : namedItemSchema);
  return Response.json(await addSchoolData(actor, kind, input), { status: 201 });
});
