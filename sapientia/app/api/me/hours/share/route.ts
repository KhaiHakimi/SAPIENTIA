import { requireUser } from '@/features/auth/server/current-user.service';
import { hoursMonthQuerySchema, hoursShareSchema } from '@/features/hours/schemas/hours.schemas';
import { shareHoursMonth, unshareHoursMonth } from '@/features/hours/server/hours.service';
import { readJson, readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** PUT /api/me/hours/share: { month }. Shares the caller's total for the month as it is now; never the entries. */
export const PUT = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock);
  const { month } = await readJson(request, hoursShareSchema);
  return Response.json(await shareHoursMonth(actor, month, clock));
});

/** DELETE /api/me/hours/share?month=YYYY-MM: withdraws the caller's shared total for the month. */
export const DELETE = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const { month } = readQuery(request, hoursMonthQuerySchema);
  await unshareHoursMonth(actor, month);
  return new Response(null, { status: 204 });
});
