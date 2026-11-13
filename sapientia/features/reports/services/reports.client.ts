import { apiFetch } from '@/shared/api/api-client';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { MonthlyReport, ReportFormat } from '../interfaces/monthly-report.interface';

export const monthlyReportKey = (month: string) => ['reports', 'monthly', month] as const;

export function fetchMonthlyReport(month: string): Promise<MonthlyReport> {
  return apiFetch(`/api/reports/monthly?month=${encodeURIComponent(month)}`);
}

/** A plain link: the browser downloads the file with the session cookie, and the server names it. */
export function monthlyReportFileUrl(month: string, format: ReportFormat, lang: Lang): string {
  const query = new URLSearchParams({ month, format, lang });
  return `/api/reports/monthly/export?${query.toString()}`;
}
