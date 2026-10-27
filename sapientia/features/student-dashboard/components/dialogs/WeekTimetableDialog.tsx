'use client';

import { PixelButton } from '@/shared/components/PixelButton';
import { ScrollDialog, scrollStyles } from '@/shared/components/ScrollDialog';
import { useMessages } from '@/shared/i18n/useLanguage';
import { DEMO_TODAY_INDEX } from '../../constants/demo-clock.constants';
import { SAMPLE_WEEK } from '../../data/sample-timetable';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import styles from '../../styles/WeekTimetableDialog.module.css';
import timetable from '../../styles/Timetable.module.css';
import { TimetableSlotRow } from '../cards/TimetableSlotRow';

interface WeekTimetableDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Monday to Friday on one parchment; today is marked and the current lesson highlighted. */
export function WeekTimetableDialog({ open, onClose }: WeekTimetableDialogProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { student } = useStudentProgress();

  return (
    <ScrollDialog
      open={open}
      onClose={onClose}
      eyebrow={student.className}
      title={text.weekTitle}
      closeLabel={text.close}
      wide
      actions={<PixelButton onClick={onClose}>{text.close}</PixelButton>}
    >
      <p className={scrollStyles.intro}>{text.weekIntro}</p>
      <div className={styles.days}>
        {SAMPLE_WEEK.map((slots, index) => {
          const isToday = index === DEMO_TODAY_INDEX;
          return (
            <section key={text.daysFull[index]} className={[styles.day, isToday && styles.today].filter(Boolean).join(' ')}>
              <h4>
                {text.daysFull[index]}
                {isToday && <span className={styles.tag}>{text.weekToday}</span>}
              </h4>
              <ul className={`${timetable.list} ${styles.slots}`}>
                {slots.map((slot) => (
                  <TimetableSlotRow key={slot.from} slot={slot} isToday={isToday} variant="scroll" />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </ScrollDialog>
  );
}
