'use client';

import { PixelCard } from '@/shared/components/PixelCard';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { useMessages } from '@/shared/i18n/useLanguage';
import { DEMO_TODAY_INDEX } from '../../constants/demo-clock.constants';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import styles from '../../styles/TorchStreakCard.module.css';

/** A running day count beside the five school-day torches. Lit torches flicker; today's pulses until a finished quest lights it. */
export function TorchStreakCard({ className }: { className?: string }) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { streak, todayLit } = useStudentProgress();

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
            const lit = index < DEMO_TODAY_INDEX || (index === DEMO_TODAY_INDEX && todayLit);
            const isToday = index === DEMO_TODAY_INDEX;
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
