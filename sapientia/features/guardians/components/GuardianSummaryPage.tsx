'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate, formatDayShort, todayInZone } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { addDays, mondayOf } from '@/shared/services/school-clock.service';
import { GUARDIANS_MESSAGES } from '../i18n/guardians.messages';
import type { GuardiansMessages } from '../i18n/guardians-messages.interface';
import type { GuardianSummary, GuardianSummaryChild } from '../interfaces/guardian.interface';
import { fetchGuardianSummary, guardianSummaryKey } from '../services/guardians.client';
import styles from '../styles/Guardians.module.css';

/**
 * Administrators: the one-page summary for a guardian without a smartphone (plan Phase 4, Sprint 13 part 2). Only the sheet
 * prints (the print-area rule in app/globals.css). Each load is audited on the server, so it is fetched once, not on focus.
 */
export function GuardianSummaryPage({ id }: { id: string }) {
  const text = useMessages(GUARDIANS_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const [nextWeek, setNextWeek] = useState(false);
  const monday = mondayOf(todayInZone(user.timeZone), nextWeek ? 1 : 0);
  const summary = useQuery({
    queryKey: guardianSummaryKey(id, monday),
    queryFn: () => fetchGuardianSummary(id, monday),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.summaryTitle}</h1>
          <p>{text.summaryIntro}</p>
        </div>
      </div>
      <div className={`${calm.row} ${styles.summaryTools}`}>
        <Link href="/staff/guardians" className={`${calm.button} ${calm.small}`}>‹ {text.summaryBack}</Link>
        <button type="button" className={`${calm.button} ${calm.small}`} aria-pressed={!nextWeek} onClick={() => setNextWeek(false)}>
          {text.summaryThisWeek}
        </button>
        <button type="button" className={`${calm.button} ${calm.small}`} aria-pressed={nextWeek} onClick={() => setNextWeek(true)}>
          {text.summaryNextWeek}
        </button>
        <button type="button" className={`${calm.button} ${calm.primary} ${calm.small}`} disabled={!summary.data} onClick={() => window.print()}>
          {text.summaryPrint}
        </button>
      </div>

      {summary.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : summary.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(summary.error, lang)}</div>
      ) : (
        <SummarySheet text={text} summary={summary.data} monday={monday} />
      )}
    </>
  );
}

function SummarySheet({ text, summary, monday }: { text: GuardiansMessages; summary: GuardianSummary; monday: string }) {
  const { lang } = useLanguage();
  const lastDay = summary.children[0]?.week.days.filter((day) => day.weekday <= 5 || day.schoolDay).at(-1)?.date ?? addDays(monday, 4);
  const printedAt = formatDate(summary.generatedAt, lang, { withTime: true, timeZone: summary.timeZone });

  return (
    <article className={`print-area ${calm.card} ${styles.summary}`} aria-labelledby="summary-heading">
      <p className={styles.slipHeading}>{summary.schoolName}</p>
      <h2 id="summary-heading">{text.summaryHeading(summary.guardianName)}</h2>
      <p className={calm.muted}>{text.summaryPrinted(printedAt)}</p>
      {summary.children.length === 0 ? (
        <p className={calm.empty}>{text.summaryNoChildren}</p>
      ) : (
        summary.children.map((child, index) => (
          <SummaryChild key={`${child.name}-${index}`} text={text} child={child} homeworkFrom={summary.homeworkFrom}
            homeworkTo={summary.homeworkTo} weekFrom={monday} weekTo={lastDay} />
        ))
      )}
      <p className={styles.summaryFooter}>{text.summaryFooter}</p>
    </article>
  );
}

interface SummaryChildProps {
  text: GuardiansMessages;
  child: GuardianSummaryChild;
  homeworkFrom: string;
  homeworkTo: string;
  weekFrom: string;
  weekTo: string;
}

function SummaryChild({ text, child, homeworkFrom, homeworkTo, weekFrom, weekTo }: SummaryChildProps) {
  const { lang } = useLanguage();
  const day = (isoDay: string) => formatDayShort(isoDay, lang);
  const days = child.week.days.filter((entry) => entry.weekday <= 5 || entry.schoolDay);

  return (
    <section className={styles.summaryChild}>
      <h3>{text.summaryChild(child.name, child.className)}</h3>
      <h4>{text.summaryHomeworkTitle(day(homeworkFrom), day(homeworkTo))}</h4>
      {child.homework.length === 0 ? (
        <p className={calm.muted}>{text.summaryHomeworkEmpty}</p>
      ) : (
        <table className={calm.table}>
          <thead>
            <tr>
              <th scope="col">{text.summaryColumns.due}</th>
              <th scope="col">{text.summaryColumns.subject}</th>
              <th scope="col">{text.summaryColumns.title}</th>
              <th scope="col">{text.summaryColumns.teacher}</th>
            </tr>
          </thead>
          <tbody>
            {child.homework.map((item) => (
              <tr key={item.id}>
                <td>{day(item.dueOn)}</td>
                <td>{item.subjectName}</td>
                <td>
                  {item.title}
                  {item.details && <div className={`${calm.help} ${styles.summaryDetails}`}>{item.details}</div>}
                </td>
                <td>{item.teacherName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h4>{text.summaryWeekTitle(day(weekFrom), day(weekTo))}</h4>
      <table className={calm.table}>
        <tbody>
          {days.map((entry) => (
            <tr key={entry.date}>
              <th scope="row">{day(entry.date)}</th>
              <td>
                {entry.lessons.length === 0
                  ? <span className={calm.muted}>{entry.schoolDay ? text.summaryNoLessons : text.summaryDayOff}</span>
                  : entry.lessons.map((lesson, index) => (
                    <span key={`${lesson.startTime}-${index}`} className={styles.summaryLesson}>
                      {lesson.startTime}–{lesson.endTime} {lesson.subjectName}{lesson.relief ? ` (${text.summaryRelief})` : ''}
                    </span>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
