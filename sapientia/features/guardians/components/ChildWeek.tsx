'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDayShort, todayInZone } from '@/shared/i18n/format-date';
import { useLanguage } from '@/shared/i18n/useLanguage';
import { addDays, mondayOf } from '@/shared/services/school-clock.service';
import type { GuardianViewMessages } from '../i18n/guardian-view-messages.interface';
import { childWeekKey, fetchChildWeek } from '../services/guardian-auth.client';
import styles from '../styles/Guardians.module.css';

interface ChildWeekProps {
  text: GuardianViewMessages;
  linkId: string;
  timeZone: string;
}

/** One child's class timetable, Monday to Friday (and any school day at the weekend), with last and next week. */
export function ChildWeek({ text, linkId, timeZone }: ChildWeekProps) {
  const { lang } = useLanguage();
  const today = todayInZone(timeZone);
  const [offset, setOffset] = useState(0);
  const monday = mondayOf(today, offset);
  const week = useQuery({ queryKey: childWeekKey(linkId, monday), queryFn: () => fetchChildWeek(linkId, monday) });
  const days = week.data?.days.filter((day) => day.weekday <= 5 || day.schoolDay) ?? [];

  return (
    <>
      <div className={styles.weekNav}>
        <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => setOffset((weeks) => weeks - 1)}>‹ {text.weekPrevious}</button>
        <p aria-live="polite">{text.weekRange(formatDayShort(monday, lang), formatDayShort(addDays(monday, 4), lang))}</p>
        <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => setOffset((weeks) => weeks + 1)}>{text.weekNext} ›</button>
      </div>
      {week.isPending && <p className={calm.loading} role="status">{text.loading}</p>}
      {week.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(week.error, lang)}</div>}
      <div className={styles.days}>
        {days.map((day) => (
          <section key={day.date} className={[styles.day, day.date === today && styles.today].filter(Boolean).join(' ')}>
            <h4>{formatDayShort(day.date, lang)}</h4>
            {day.lessons.length === 0 ? (
              <p className={calm.muted}>{day.schoolDay ? text.noLessons : text.dayOff}</p>
            ) : (
              <ul>
                {day.lessons.map((lesson, index) => (
                  <li key={`${lesson.startTime}-${index}`}>
                    <span className={calm.code}>{lesson.startTime}–{lesson.endTime}</span> {lesson.subjectName}
                    {lesson.relief && <> <span className={calm.badge}>{text.relief}</span></>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
