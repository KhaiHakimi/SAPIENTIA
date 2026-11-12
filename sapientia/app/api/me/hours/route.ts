import { requireUser } from '@/features/auth/server/current-user.service';
import { hoursMonthQuerySchema, newHoursEntrySchema } from '@/features/hours/schemas/hours.schemas';
import { addHoursEntry, getHoursMonth } from '@/features/hours/server/hours.service';
import { readJson, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/me/hours?month=YYYY-MM: the caller's own private hours log for a month, its total and any shared total. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const { month } = readQuery(request, hoursMonthQuerySchema);
  return Response.json(await getHoursMonth(actor, month));
});

/** POST /api/me/hours: { onDate, minutes, kind, note? }. Adds an entry to the caller's own log. */
export const POST = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock);
  const input = await readJson(request, newHoursEntrySchema);
  return Response.json(await addHoursEntry(actor, input, clock), { status: 201 });
});
