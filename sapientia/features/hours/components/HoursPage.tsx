'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { formatDuration } from '@/features/capacity/services/duration-text';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay, formatMonth, todayInZone } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { HOURS_MESSAGES } from '../i18n/hours.messages';
import { deleteHoursEntry, fetchHoursMonth, hoursMonthKey } from '../services/hours.client';
import styles from '../styles/Hours.module.css';
import { AddHoursEntryForm } from './AddHoursEntryForm';
import { HoursShareCard } from './HoursShareCard';

/**
 * Private hours log (plan Phase 3, Sprint 9): the caller's own entries for a month, the total, and sharing that total.
 * initialMonth (YYYY-MM) is the month it opens on, this month unless given.
 */
export function HoursPage({ initialMonth }: { initialMonth?: string } = {}) {
  const text = useMessages(HOURS_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const queryClient = useQueryClient();
  const thisMonth = todayInZone(user.timeZone).slice(0, 7);
  const [month, setMonth] = useState(initialMonth ?? thisMonth);
  // A cleared or half-typed month field leaves the query switched off, and a switched-off query stays pending for ever:
  // show nothing until the month is whole, as the report and lesson pages do.
  const valid = /^\d{4}-\d{2}$/.test(month);
  const data = useQuery({ queryKey: hoursMonthKey(month), queryFn: () => fetchHoursMonth(month), enabled: valid });
  const remove = useMutation({
    mutationFn: deleteHoursEntry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hoursMonthKey(month) }),
  });
  const duration = (minutes: number) => formatDuration(minutes, lang);

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.pageTitle}</h1>
          <p>{text.intro}</p>
        </div>
      </div>
      <p className={`${calm.alert} ${calm.alertInfo}`}>{text.privacy}</p>
      <AddHoursEntryForm />

      <section className={calm.card} aria-labelledby="hours-month-title">
        <div className={`${calm.field} ${styles.monthField}`}>
          <label className={calm.label} htmlFor="hours-month">{text.month}</label>
          <input id="hours-month" type="month" className={calm.input} value={month} max={thisMonth}
            onChange={(event) => setMonth(event.target.value)} />
        </div>
        <h2 id="hours-month-title">{text.monthTitle(valid ? formatMonth(month, lang) : '')}</h2>
        {!valid ? null : data.isPending ? (
          <p className={calm.loading} role="status">{text.loading}</p>
        ) : data.isError ? (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(data.error, lang)}</div>
        ) : (
          <>
            <p><strong>{text.total(duration(data.data.totalMinutes))}</strong></p>
            {data.data.entries.length === 0 ? (
              <p className={calm.empty}>{text.empty}</p>
            ) : (
              <div className={calm.tableWrap}>
                <table className={calm.table}>
                  <thead>
                    <tr>
                      <th scope="col">{text.columns.date}</th>
                      <th scope="col">{text.columns.time}</th>
                      <th scope="col">{text.columns.kind}</th>
                      <th scope="col">{text.columns.note}</th>
                      <th scope="col">{text.columns.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.entries.map((entry) => {
                      const day = formatDay(entry.onDate, lang, { weekday: true });
                      return (
                        <tr key={entry.id}>
                          <td>{day}</td>
                          <td>{duration(entry.minutes)}</td>
                          <td>{text.kinds[entry.kind]}</td>
                          <td>{entry.note ?? ''}</td>
                          <td>
                            <button type="button" className={`${calm.button} ${calm.small}`} disabled={remove.isPending}
                              aria-label={text.removeLabel(day, duration(entry.minutes))} onClick={() => remove.mutate(entry.id)}>
                              {text.remove}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {remove.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(remove.error, lang)}</div>}
          </>
        )}
      </section>

      {data.isSuccess && <HoursShareCard data={data.data} canShare={month <= thisMonth} />}
    </>
  );
}
