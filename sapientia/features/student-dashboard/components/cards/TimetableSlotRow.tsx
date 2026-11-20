'use client';

import type { ClassLesson } from '@/features/timetable/interfaces/timetable.interface';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import { lessonSprite, slotProgress, slotStatus } from '../../services/timetable.service';
import styles from '../../styles/Timetable.module.css';

interface TimetableSlotRowProps {
  lesson: ClassLesson;
  isToday: boolean;
  /** "card" on the dashboard, "scroll" inside the parchment weekly timetable. */
  variant: 'card' | 'scroll';
}

/** One lesson. Shared by the "today" card and the weekly scroll, so both show "now" and relief the same way. */
export function TimetableSlotRow({ lesson, isToday, variant }: TimetableSlotRowProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { clock } = useStudentProgress();
  const status = slotStatus(lesson, isToday, clock.minutes);
  const isNow = status === 'now';
  const progress = isNow ? slotProgress(lesson, clock.minutes) : null;

  return (
    <li className={[styles.slot, styles[variant], isNow && styles.now, status === 'past' && styles.past].filter(Boolean).join(' ')}>
      <time>{lesson.startTime}</time>
      <span className={styles.icon} aria-hidden="true">
        {/* Monsters belong to quiz levels, not subjects, so a lesson shows a scroll; physical education gets a trophy. */}
        <PixelSprite name={lessonSprite(lesson.subjectName)} scale={2} className={styles.sprite} />
      </span>
      <div>
        <b>{lesson.subjectName}</b>
        <div className={styles.sub}>
          {lesson.startTime}–{lesson.endTime}
          {progress && ` • ${text.minutesLeft(progress.minutesLeft)}`}
        </div>
      </div>
      {(isNow || lesson.relief) && (
        <span className={styles.pills}>
          {isNow && <span className={styles.pill}>{text.now}</span>}
          {lesson.relief && <span className={`${styles.pill} ${styles.relief}`}>{text.relief}</span>}
        </span>
      )}
      {progress && (
        <div className={styles.progress} aria-hidden="true">
          <i style={{ width: `${progress.percent}%` }} />
        </div>
      )}
    </li>
  );
}
