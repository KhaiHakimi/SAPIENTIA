import { z } from 'zod';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { REPORT_FORMATS } from '../constants/reports.constants';
import type { ReportFormat } from '../interfaces/monthly-report.interface';

const monthSchema = z.string({ error: 'invalid_month' }).regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'invalid_month' });

/** GET /api/reports/monthly?month=YYYY-MM. */
export const monthlyReportQuerySchema = z.object({ month: monthSchema });

/** GET /api/reports/monthly/export?month=YYYY-MM&format=pdf|xlsx&lang=ms|en. */
export const monthlyReportExportQuerySchema = z.object({
  month: monthSchema,
  format: z.enum(REPORT_FORMATS as [ReportFormat, ...ReportFormat[]], { error: 'invalid_format' }),
  lang: z.enum(['ms', 'en'] satisfies Lang[], { error: 'invalid_lang' }),
});
