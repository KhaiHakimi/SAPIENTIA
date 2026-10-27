'use client';

import { monsterForSubject, type Monster } from '@/features/characters';
import { CharacterPortrait } from '@/features/characters/components/CharacterPortrait';
import { BATTLE_MESSAGES } from '@/features/battle/i18n/battle.messages';
import { PixelButton } from '@/shared/components/PixelButton';
import { PixelCard } from '@/shared/components/PixelCard';
import { SegmentedBar } from '@/shared/components/SegmentedBar';
import { SCHOOL_SUBJECTS } from '@/shared/data/school-subjects';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import styles from '../../styles/SubjectMastery.module.css';

interface SubjectMasteryCardProps {
  className?: string;
  onFight: (monster: Monster) => void;
}

/** A bar per subject, then the weakest subject's monster, one tap from a fight. */
export function SubjectMasteryCard({ className, onFight }: SubjectMasteryCardProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const battleText = useMessages(BATTLE_MESSAGES);
  const { pick } = useLanguage();
  const { mastery } = useStudentProgress();
  const weakest = mastery.reduce((low, entry) => (entry.percent < low.percent ? entry : low));
  const monster = monsterForSubject(weakest.subject);

  return (
    <PixelCard id="mastery" title={text.mastery} icon="owl" className={className}>
      <div className={styles.subjects}>
        {mastery.map((entry) => {
          const name = pick(SCHOOL_SUBJECTS[entry.subject].name);
          return (
            <div key={entry.subject} className={styles.subject}>
              <b>{name}</b>
              <span>{entry.percent}%</span>
              <SegmentedBar percent={entry.percent} tone="skill" thin aria-label={name} />
            </div>
          );
        })}
        <div className={styles.suggested}>
          <p className={styles.suggestedHead}>{text.suggestedHead}</p>
          {monster && (
            <div className={styles.suggestedRow}>
              <CharacterPortrait character={monster} size={48} rim />
              <div>
                <b>{pick(monster.name)}</b>
                <span>{text.suggestedWhy(pick(SCHOOL_SUBJECTS[weakest.subject].name), weakest.percent)}</span>
              </div>
              <PixelButton size="small" className={styles.fight} aria-label={`${battleText.fight}: ${pick(monster.name)}`} onClick={() => onFight(monster)}>
                {battleText.fight}
              </PixelButton>
            </div>
          )}
        </div>
      </div>
    </PixelCard>
  );
}
