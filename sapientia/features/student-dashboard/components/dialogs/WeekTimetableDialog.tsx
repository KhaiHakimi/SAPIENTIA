'use client';

import { useState } from 'react';
import { PixelButton } from '@/shared/components/PixelButton';
import { ScrollDialog, scrollStyles } from '@/shared/components/ScrollDialog';
import { formatDayShort } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { useClassWeek } from '../../hooks/useClassWeek';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import { addDays, mondayOf } from '@/shared/services/school-clock.service';
import { daysToShow } from '../../services/timetable.service';
import styles from '../../styles/WeekTimetableDialog.module.css';
import timetable from '../../styles/Timetable.module.css';
import { TimetableSlotRow } from '../cards/TimetableSlotRow';

interface WeekTimetableDialogProps {
  open: boolean;
  onClose: () => void;
}

/** The class's week on one parchment, Monday to Friday (and any school day at the weekend); today and the current lesson marked. */
export function WeekTimetableDialog({ open, onClose }: WeekTimetableDialogProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { lang } = useLanguage();
  const { student, clock } = useStudentProgress();
  // Weeks from this one; the scroll opens on this week again each time.
  const [offset, setOffset] = useState(0);
  const monday = mondayOf(clock.today, offset);
  const week = useClassWeek(monday);
  const days = week.data ? daysToShow(week.data.days) : [];
  const close = () => {
    setOffset(0);
    onClose();
  };

  return (
    <ScrollDialog
      open={open}
      onClose={close}
      eyebrow={student.className}
      title={text.weekTitle}
      closeLabel={text.close}
      wide
      actions={<PixelButton onClick={close}>{text.close}</PixelButton>}
    >
      <p className={scrollStyles.intro}>{text.weekIntro}</p>
      <div className={styles.nav}>
        <PixelButton variant="ghost" onClick={() => setOffset((weeks) => weeks - 1)}>
          ‹ {text.weekPrevious}
        </PixelButton>
        <p className={styles.range} aria-live="polite">
          {text.weekRange(formatDayShort(monday, lang), formatDayShort(addDays(monday, 4), lang))}
        </p>
        <PixelButton variant="ghost" onClick={() => setOffset((weeks) => weeks + 1)}>
          {text.weekNext} ›
        </PixelButton>
      </div>
      {week.isError && <p role="alert">{text.timetableError}</p>}
      {!week.data && !week.isError && <p>{text.timetableLoading}</p>}
      <div className={styles.days}>
        {days.map((day) => {
          const isToday = day.date === clock.today;
          return (
            <section key={day.date} className={[styles.day, isToday && styles.today].filter(Boolean).join(' ')}>
              <h4>
                {formatDayShort(day.date, lang)}
                {isToday && <span className={styles.tag}>{text.weekToday}</span>}
              </h4>
              {day.lessons.length === 0 ? (
                <p className={styles.empty}>{day.schoolDay ? text.noLessons : text.dayOff}</p>
              ) : (
                <ul className={`${timetable.list} ${styles.slots}`}>
                  {day.lessons.map((lesson, index) => (
                    <TimetableSlotRow key={`${lesson.startTime}-${index}`} lesson={lesson} isToday={isToday} variant="scroll" />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </ScrollDialog>
  );
}
