'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay, todayInZone } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { LESSONS_MESSAGES } from '../i18n/lessons.messages';
import { fetchLessonDay, lessonDayKey } from '../services/lessons.client';
import styles from '../styles/Lessons.module.css';
import { LessonPeriodItem } from './LessonPeriodItem';

/** Lesson records (plan Phase 3, Sprint 9): the caller's periods on a day, today by default, each recorded in one tap. */
export function LessonsPage() {
  const text = useMessages(LESSONS_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const [onDate, setOnDate] = useState(() => todayInZone(user.timeZone));
  const day = useQuery({ queryKey: lessonDayKey(onDate), queryFn: () => fetchLessonDay(onDate), enabled: onDate !== '' });

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.pageTitle}</h1>
          <p>{text.intro}</p>
        </div>
      </div>
      <section className={calm.card} aria-labelledby="lessons-day-title">
        <div className={`${calm.field} ${styles.dateField}`}>
          <label className={calm.label} htmlFor="lessons-date">{text.date}</label>
          <input id="lessons-date" type="date" className={calm.input} value={onDate} max={todayInZone(user.timeZone)}
            onChange={(event) => setOnDate(event.target.value)} />
        </div>
        <h2 id="lessons-day-title">{onDate ? text.dayTitle(formatDay(onDate, lang, { weekday: true })) : text.pageTitle}</h2>
        {onDate === '' ? null : day.isPending ? (
          <p className={calm.loading} role="status">{text.loading}</p>
        ) : day.isError ? (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(day.error, lang)}</div>
        ) : (
          <>
            {!day.data.recordable && <p className={`${calm.alert} ${calm.alertInfo}`} role="status">{text.notRecordable}</p>}
            {day.data.periods.length === 0 ? (
              <p className={calm.empty}>{text.noPeriods}</p>
            ) : (
              <ul className={styles.periods}>
                {day.data.periods.map((period) => (
                  // Keyed by date too, so a day's form state never carries over to another day.
                  <LessonPeriodItem key={`${day.data.onDate}-${period.slot.id}`} period={period} onDate={day.data.onDate} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}
