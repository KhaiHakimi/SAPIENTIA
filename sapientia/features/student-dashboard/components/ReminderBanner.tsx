'use client';

import { formatDayShort } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { mondayOf } from '@/shared/services/school-clock.service';
import { useClassWeek } from '../hooks/useClassWeek';
import { useStudentProgress } from '../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../i18n/dashboard.messages';
import { isReminderTime, nextSchoolDay, questsToRemind } from '../services/reminder.service';
import styles from '../styles/StudentDashboard.module.css';

/**
 * The afternoon reminder (plan Phase 4, Sprint 14): homework due on the next school day, shown on the board from 2 pm to
 * 6 pm school time and never at night. Nothing is sent to the pupil's device and nothing is stored; it is the board itself.
 */
export function ReminderBanner({ onOpenQuest }: { onOpenQuest: (questId: string) => void }) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { lang } = useLanguage();
  const { clock, quests, done, questsStatus } = useStudentProgress();
  const thisWeek = useClassWeek(mondayOf(clock.today, 0));
  const nextWeek = useClassWeek(mondayOf(clock.today, 1));

  if (questsStatus !== 'ready' || !isReminderTime(clock.minutes) || !thisWeek.data || !nextWeek.data) return null;
  const dueOn = nextSchoolDay(clock.today, [...thisWeek.data.days, ...nextWeek.data.days]);
  const due = dueOn ? questsToRemind(quests, done, dueOn) : [];
  if (!dueOn || due.length === 0) return null;

  return (
    <section className={`${styles.reminder} pixel-frame px`} aria-labelledby="reminder-title">
      <h2 id="reminder-title">{text.reminderTitle}</h2>
      <p>{text.reminderText(due.length, formatDayShort(dueOn, lang))}</p>
      <ul>
        {due.map((quest) => (
          <li key={quest.id}>
            <button type="button" className={styles.reminderLink} onClick={() => onOpenQuest(quest.id)}>
              {quest.subjectName}: {quest.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
