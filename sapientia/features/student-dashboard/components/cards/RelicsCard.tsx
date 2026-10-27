'use client';

import { PixelCard } from '@/shared/components/PixelCard';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import styles from '../../styles/Relics.module.css';

interface RelicsCardProps {
  className?: string;
  /** Relics unlocked by the last action; they pop in. */
  freshRelicIds: readonly string[];
}

export function RelicsCard({ className, freshRelicIds }: RelicsCardProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { pick } = useLanguage();
  const { relics, earnedRelicIds } = useStudentProgress();

  return (
    <PixelCard id="relics" title={text.relics} icon="crown" aside={`${earnedRelicIds.length}/${relics.length}`} className={className}>
      <div className={styles.grid}>
        {relics.map((relic) => {
          const earned = earnedRelicIds.includes(relic.id);
          return (
            <div key={relic.id} className={[styles.relic, earned ? styles.earned : styles.locked, freshRelicIds.includes(relic.id) && styles.fresh].filter(Boolean).join(' ')}>
              <PixelSprite name={relic.sprite} scale={4} className={styles.sprite} />
              <b>{pick(relic.name)}</b>
              <small>{earned ? text.earned : `${text.locked}: ${pick(relic.hint)}`}</small>
            </div>
          );
        })}
      </div>
    </PixelCard>
  );
}
