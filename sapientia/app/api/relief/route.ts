import { requireUser } from '@/features/auth/server/current-user.service';
import { newReliefSchema, reliefDayQuerySchema } from '@/features/relief/schemas/relief.schemas';
import { assignRelief, getReliefDay } from '@/features/relief/server/relief.service';
import { readJson, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/relief?teacherId=&onDate=: that teacher's periods on the date and the relief arranged for each. Administrators only. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const { teacherId, onDate } = readQuery(request, reliefDayQuerySchema);
  return Response.json(await getReliefDay(actor, teacherId, onDate, appClock()));
});

/**
 * POST /api/relief: { slotId, onDate, reliefTeacherId }. Administrators only. The relief teacher must be free in the period.
 * A period that already has relief, or a relief teacher taken at the same moment by someone else, answers 409.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const input = await readJson(request, newReliefSchema);
  return Response.json(await assignRelief(actor, input, appClock()), { status: 201 });
});
