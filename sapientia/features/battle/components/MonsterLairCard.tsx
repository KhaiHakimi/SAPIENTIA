'use client';

import { MONSTERS, type Monster } from '@/features/characters';
import { CharacterPortrait } from '@/features/characters/components/CharacterPortrait';
import { PixelButton } from '@/shared/components/PixelButton';
import { PixelCard } from '@/shared/components/PixelCard';
import { SCHOOL_SUBJECTS } from '@/shared/data/school-subjects';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { BATTLE_MESSAGES } from '../i18n/battle.messages';
import { questionsFor } from '../services/battle-run.service';
import { battleStatsStore, recordFor } from '../services/battle-stats.store';
import styles from '../styles/MonsterLair.module.css';

interface MonsterLairCardProps {
  className?: string;
  onFight: (monster: Monster) => void;
}

/** "Sarang Raksasa": one monster per subject, each with its difficulty, question count, hit and the student's record. */
export function MonsterLairCard({ className, onFight }: MonsterLairCardProps) {
  const text = useMessages(BATTLE_MESSAGES);
  const { pick } = useLanguage();
  const stats = usePersistentStore(battleStatsStore);

  return (
    <PixelCard id="lair" title={text.lairTitle} icon="skull" className={className}>
      <p className={styles.intro}>{text.lairIntro}</p>
      <div className={styles.grid}>
        {MONSTERS.map((monster) => {
          const record = recordFor(stats, monster.id);
          const beaten = record.wins > 0;
          const action = record.attempts > 0 ? text.fightAgain : text.fight;
          return (
            <article key={monster.id} className={[styles.monster, beaten && styles.beaten].filter(Boolean).join(' ')}>
              <div className={styles.art}>
                <CharacterPortrait character={monster} size={112} className={styles.portrait} />
              </div>
              <b className={styles.name}>{pick(monster.name)}</b>
              <span className={styles.subject}>{pick(SCHOOL_SUBJECTS[monster.subject].name)}</span>
              <div className={styles.chips}>
                <span className={`${styles.chip} ${styles[`level${monster.level}`]}`}>{text.levels[monster.level]}</span>
                <span className={styles.chip}>{text.questionCount(questionsFor(monster.subject).length)}</span>
                <span className={styles.chip}>{text.hitsFor(monster.hit)}</span>
                {beaten && <span className={`${styles.chip} ${styles.done}`}>{text.beaten}</span>}
              </div>
              <span className={styles.record}>{text.record(record.attempts, record.wins)}</span>
              <PixelButton size="small" className={styles.fight} aria-label={`${action}: ${pick(monster.name)}`} onClick={() => onFight(monster)}>
                {action}
              </PixelButton>
            </article>
          );
        })}
      </div>
    </PixelCard>
  );
}
