import { requireUser } from '@/features/auth/server/current-user.service';
import { monthlyReportExportQuerySchema } from '@/features/reports/schemas/reports.schemas';
import { exportMonthlyReport } from '@/features/reports/server/reports.service';
import { readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * GET /api/reports/monthly/export?month=YYYY-MM&format=pdf|xlsx&lang=ms|en: the monthly report as a file to save.
 * Administrators only. Each export is in the audit log.
 */
export const GET = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock, ['admin']);
  const query = readQuery(request, monthlyReportExportQuerySchema);
  const file = await exportMonthlyReport(actor, query, clock);
  return new Response(file.body, {
    headers: {
      'Content-Type': file.contentType,
      // The name is built from fixed words and a validated month, so it is plain ASCII and needs no escaping.
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
    },
  });
});
