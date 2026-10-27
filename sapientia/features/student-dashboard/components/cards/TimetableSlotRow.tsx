'use client';

import { monsterForSubject } from '@/features/characters';
import { CharacterPortrait } from '@/features/characters/components/CharacterPortrait';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { SCHOOL_SUBJECTS } from '@/shared/data/school-subjects';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { DEMO_NOW_MINUTES } from '../../constants/demo-clock.constants';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import type { TimetableSlot } from '../../interfaces/timetable.interface';
import { slotProgress, slotStatus } from '../../services/timetable.service';
import styles from '../../styles/Timetable.module.css';

interface TimetableSlotRowProps {
  slot: TimetableSlot;
  isToday: boolean;
  /** "card" on the dashboard, "scroll" inside the parchment weekly timetable. */
  variant: 'card' | 'scroll';
}

/** One lesson. Shared by the "today" card and the weekly scroll, so both show "now" and relief the same way. */
export function TimetableSlotRow({ slot, isToday, variant }: TimetableSlotRowProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { pick } = useLanguage();
  const status = slotStatus(slot, isToday, DEMO_NOW_MINUTES);
  const isNow = status === 'now';
  const progress = isNow ? slotProgress(slot, DEMO_NOW_MINUTES) : null;
  // Each subject wears its monster from the Lair; Physical Education gets a trophy and any other subject a book.
  const monster = monsterForSubject(slot.subject);

  return (
    <li className={[styles.slot, styles[variant], isNow && styles.now, status === 'past' && styles.past].filter(Boolean).join(' ')}>
      <time>{slot.from}</time>
      <span className={styles.icon} aria-hidden="true">
        {monster ? (
          <CharacterPortrait character={monster} size={32} rim className={styles.portrait} />
        ) : (
          <PixelSprite name={slot.subject === 'pe' ? 'trophy' : 'scroll'} scale={2} className={styles.sprite} />
        )}
      </span>
      <div>
        <b>{pick(SCHOOL_SUBJECTS[slot.subject].name)}</b>
        <div className={styles.sub}>
          {pick(slot.room)} • {slot.from}–{slot.to}
          {progress && ` • ${text.minutesLeft(progress.minutesLeft)}`}
        </div>
      </div>
      {(isNow || slot.relief) && (
        <span className={styles.pills}>
          {isNow && <span className={styles.pill}>{text.now}</span>}
          {slot.relief && <span className={`${styles.pill} ${styles.relief}`}>{text.relief}</span>}
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
