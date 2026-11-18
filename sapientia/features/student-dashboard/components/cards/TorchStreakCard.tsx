'use client';

import { PixelCard } from '@/shared/components/PixelCard';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import { weekdayIndex } from '@/shared/services/school-clock.service';
import styles from '../../styles/TorchStreakCard.module.css';

/**
 * A running day count beside the five school-day torches. Lit torches flicker; today's pulses until a finished quest lights it.
 * The earlier days are sample data, like the streak itself; at the weekend no torch is today's.
 */
export function TorchStreakCard({ className }: { className?: string }) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { streak, todayLit, clock } = useStudentProgress();
  const todayIndex = weekdayIndex(clock.today);

  return (
    <PixelCard id="week" title={text.torchStreak} icon="flame" className={className}>
      <div className={styles.row}>
        <div className={styles.big}>
          <PixelSprite name="flame" scale={4} className={styles.flame} />
          <b>{streak}</b>
          <small>{text.streakUnit(streak)}</small>
        </div>
        <div className={styles.week}>
          {text.days.map((label, index) => {
            const isToday = index === todayIndex;
            const lit = index < todayIndex || (isToday && todayLit);
            return (
              <div key={label} className={[styles.day, lit && styles.lit, isToday && styles.today].filter(Boolean).join(' ')}>
                <PixelSprite name="flame" scale={3} className={lit ? styles.flame : styles.off} />
                <div>{label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <p className={styles.note}>
        <span>{todayLit ? text.torchOn : text.torchOff}</span> <span className={styles.muted}>{text.reminderNote}</span>
      </p>
    </PixelCard>
  );
}
