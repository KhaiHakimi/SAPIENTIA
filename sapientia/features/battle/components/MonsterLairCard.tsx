'use client';

import { useState } from 'react';
import { monsterForLevel } from '@/features/characters';
import { CharacterPortrait } from '@/features/characters/components/CharacterPortrait';
import { PixelButton } from '@/shared/components/PixelButton';
import { PixelCard } from '@/shared/components/PixelCard';
import { SCHOOL_SUBJECTS } from '@/shared/data/school-subjects';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';
import { BATTLE_MESSAGES } from '../i18n/battle.messages';
import type { QuizStage } from '../interfaces/quiz.interface';
import { battleStatsStore, recordFor } from '../services/battle-stats.store';
import { QUIZ_LEVELS, QUIZ_SUBJECTS, chaptersFor, isBeaten, isUnlocked, levelsBeaten, stageKey } from '../services/quiz-stage.service';
import styles from '../styles/MonsterLair.module.css';

interface MonsterLairCardProps {
  className?: string;
  onFight: (stage: QuizStage) => void;
}

/**
 * "Sarang Raksasa": pick a subject, then fight a chapter level by level. Each chapter has the four monsters, Easy to Very Hard;
 * a level opens once the one before it has been beaten.
 */
export function MonsterLairCard({ className, onFight }: MonsterLairCardProps) {
  const text = useMessages(BATTLE_MESSAGES);
  const { pick } = useLanguage();
  const stats = usePersistentStore(battleStatsStore);
  const [subject, setSubject] = useState<SchoolSubjectKey>(QUIZ_SUBJECTS[0]);

  return (
    <PixelCard id="lair" title={text.lairTitle} icon="skull" className={className}>
      <p className={styles.intro}>{text.lairIntro}</p>
      <div className={styles.subjects} role="group" aria-label={text.subjectsLabel}>
        {QUIZ_SUBJECTS.map((key) => (
          <button key={key} type="button" className={styles.subjectTab} aria-pressed={key === subject} onClick={() => setSubject(key)}>
            {pick(SCHOOL_SUBJECTS[key].name)}
          </button>
        ))}
      </div>
      {chaptersFor(subject).map((chapter) => (
        <section key={chapter.id} className={styles.chapter} aria-labelledby={`${chapter.id}-title`}>
          <header className={styles.chapterHead}>
            <h3 id={`${chapter.id}-title`}>{text.chapter(chapter.number, pick(chapter.title))}</h3>
            <span>{text.cleared(levelsBeaten(stats, chapter), QUIZ_LEVELS.length)}</span>
          </header>
          <div className={styles.levels}>
            {QUIZ_LEVELS.map((level) => {
              const stage = { chapter, level };
              const monster = monsterForLevel(level);
              const record = recordFor(stats, stageKey(stage));
              const open = isUnlocked(stats, stage);
              const beaten = isBeaten(stats, stage);
              const action = record.attempts > 0 ? text.fightAgain : text.fight;
              return (
                <article key={level} className={[styles.monster, beaten && styles.beaten, !open && styles.locked].filter(Boolean).join(' ')}>
                  <div className={styles.art}>
                    <CharacterPortrait character={monster} size={88} className={styles.portrait} />
                  </div>
                  <span className={`${styles.chip} ${styles[`level${level}`]}`}>{text.levels[level]}</span>
                  <b className={styles.name}>{pick(monster.name)}</b>
                  {open ? (
                    <>
                      <span className={styles.record}>{beaten ? text.beaten : text.hitsFor(monster.hit)}</span>
                      <span className={styles.record}>{text.record(record.attempts, record.wins)}</span>
                      <PixelButton
                        size="small"
                        className={styles.fight}
                        aria-label={`${action}: ${text.chapter(chapter.number, pick(chapter.title))}, ${text.levels[level]}`}
                        onClick={() => onFight(stage)}
                      >
                        {action}
                      </PixelButton>
                    </>
                  ) : (
                    <>
                      <span className={styles.record}>{text.unlockHint(text.levels[level - 1])}</span>
                      <PixelButton size="small" variant="ghost" className={styles.fight} disabled>
                        {text.locked}
                      </PixelButton>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </PixelCard>
  );
}
