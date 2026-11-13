'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatMonth, todayInZone } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { REPORTS_MESSAGES } from '../i18n/reports.messages';
import { buildReportDocument } from '../services/report-document.service';
import { fetchMonthlyReport, monthlyReportFileUrl, monthlyReportKey } from '../services/reports.client';
import styles from '../styles/Reports.module.css';
import { ReportSectionCard } from './ReportSectionCard';

/** The previous month: the one a principal usually reports on. */
function previousMonth(today: string): string {
  const [year, month] = today.slice(0, 7).split('-').map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Monthly principal report (plan Phase 3, Sprint 10). The page shows the same document the PDF and Excel files contain,
 * built from the same data in the reader's language.
 */
export function ReportsPage() {
  const text = useMessages(REPORTS_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const thisMonth = todayInZone(user.timeZone).slice(0, 7);
  const [month, setMonth] = useState(() => previousMonth(todayInZone(user.timeZone)));
  const valid = /^\d{4}-\d{2}$/.test(month);
  const report = useQuery({ queryKey: monthlyReportKey(month), queryFn: () => fetchMonthlyReport(month), enabled: valid });
  const reportDocument = useMemo(() => (report.data ? buildReportDocument(report.data, lang) : null), [report.data, lang]);

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.pageTitle}</h1>
          <p>{text.intro}</p>
        </div>
      </div>

      <section className={calm.card} aria-labelledby="report-title">
        <div className={`${calm.field} ${styles.monthField}`}>
          <label className={calm.label} htmlFor="report-month">{text.month}</label>
          <input id="report-month" type="month" className={calm.input} value={month} max={thisMonth}
            onChange={(event) => setMonth(event.target.value)} />
        </div>
        {/* Always present, so the section's label exists while the report loads too. */}
        <h2 id="report-title">{text.reportTitle(valid ? formatMonth(month, lang) : '')}</h2>
        {!valid ? null : report.isPending ? (
          <p className={calm.loading} role="status">{text.loading}</p>
        ) : report.isError ? (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(report.error, lang)}</div>
        ) : reportDocument && (
          <>
            <div className={styles.heading}>
              {reportDocument.heading.map((line) => <p key={line}>{line}</p>)}
            </div>
            <div className={styles.downloads} role="group" aria-label={text.downloads}>
              <a className={`${calm.button} ${calm.primary}`} href={monthlyReportFileUrl(month, 'pdf', lang)} download>{text.downloadPdf}</a>
              <a className={calm.button} href={monthlyReportFileUrl(month, 'xlsx', lang)} download>{text.downloadXlsx}</a>
            </div>
          </>
        )}
      </section>

      {reportDocument && report.isSuccess && (
        <div className={styles.sections}>
          {reportDocument.sections.map((section) => <ReportSectionCard key={section.id} section={section} />)}
        </div>
      )}
    </>
  );
}
