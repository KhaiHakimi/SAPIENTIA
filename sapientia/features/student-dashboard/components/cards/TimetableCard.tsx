'use client';

import { PixelCard } from '@/shared/components/PixelCard';
import { formatDayShort } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { useClassWeek } from '../../hooks/useClassWeek';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import { mondayOf } from '@/shared/services/school-clock.service';
import styles from '../../styles/Timetable.module.css';
import { TimetableSlotRow } from './TimetableSlotRow';

/** Today's lessons for the pupil's class, from the teachers' timetables, with relief marked. */
export function TimetableCard({ className }: { className?: string }) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { lang } = useLanguage();
  const { clock } = useStudentProgress();
  const week = useClassWeek(mondayOf(clock.today));
  const today = week.data?.days.find((day) => day.date === clock.today);

  let body;
  if (week.isError) body = <p className={styles.status} role="alert">{text.timetableError}</p>;
  else if (!week.data) body = <p className={styles.status}>{text.timetableLoading}</p>;
  else if (!today || today.lessons.length === 0) body = <p className={styles.status}>{text.noLessonsToday}</p>;
  else {
    body = (
      <ul className={styles.list}>
        {today.lessons.map((lesson, index) => (
          <TimetableSlotRow key={`${lesson.startTime}-${index}`} lesson={lesson} isToday variant="card" />
        ))}
      </ul>
    );
  }

  return (
    <PixelCard id="timetable" title={text.timetable} icon="scroll" aside={formatDayShort(clock.today, lang)} className={className}>
      {body}
    </PixelCard>
  );
}
