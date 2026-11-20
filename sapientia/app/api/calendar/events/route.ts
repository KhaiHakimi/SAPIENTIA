import { calendarEventSchema, calendarQuerySchema } from '@/features/delivery/schemas/delivery.schemas';
import { addCalendarEvent, listCalendar } from '@/features/delivery/server/school-settings.service';
import { requireUser } from '@/features/auth/server/current-user.service';
import { readJson, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/calendar/events?from=&to=: holidays and replacement working days (default: last month to a year ahead). */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const { from, to } = readQuery(request, calendarQuerySchema);
  return Response.json({ items: await listCalendar(actor, from, to, appClock()) });
});

/** POST /api/calendar/events: { onDate, kind: 'holiday' | 'working_day', title }. Administrators only; one entry per day. */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const input = await readJson(request, calendarEventSchema);
  return Response.json(await addCalendarEvent(actor, input), { status: 201 });
});
