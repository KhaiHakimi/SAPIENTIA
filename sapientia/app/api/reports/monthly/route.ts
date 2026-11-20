import { requireUser } from '@/features/auth/server/current-user.service';
import { monthlyReportQuerySchema } from '@/features/reports/schemas/reports.schemas';
import { getMonthlyReport } from '@/features/reports/server/reports.service';
import { readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/reports/monthly?month=YYYY-MM: the monthly principal report as data. Administrators only. */
export const GET = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock, ['admin']);
  const { month } = readQuery(request, monthlyReportQuerySchema);
  return Response.json(await getMonthlyReport(actor, month, clock));
});
