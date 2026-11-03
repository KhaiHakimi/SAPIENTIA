'use client';

import { monsterForLevel } from '@/features/characters';
import { CharacterPortrait } from '@/features/characters/components/CharacterPortrait';
import { BATTLE_MESSAGES } from '@/features/battle/i18n/battle.messages';
import type { QuizStage } from '@/features/battle/interfaces/quiz.interface';
import { battleStatsStore } from '@/features/battle/services/battle-stats.store';
import { nextStage } from '@/features/battle/services/quiz-stage.service';
import { PixelButton } from '@/shared/components/PixelButton';
import { PixelCard } from '@/shared/components/PixelCard';
import { SegmentedBar } from '@/shared/components/SegmentedBar';
import { SCHOOL_SUBJECTS } from '@/shared/data/school-subjects';
import { usePersistentStore } from '@/shared/hooks/usePersistentStore';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import styles from '../../styles/SubjectMastery.module.css';

interface SubjectMasteryCardProps {
  className?: string;
  onFight: (stage: QuizStage) => void;
}

/** A bar per subject, then the next level to beat in the weakest subject, one tap from a fight. */
export function SubjectMasteryCard({ className, onFight }: SubjectMasteryCardProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const battleText = useMessages(BATTLE_MESSAGES);
  const { pick } = useLanguage();
  const { mastery } = useStudentProgress();
  const stats = usePersistentStore(battleStatsStore);
  const weakest = mastery.reduce((low, entry) => (entry.percent < low.percent ? entry : low));
  const stage = nextStage(stats, weakest.subject);
  const monster = stage && monsterForLevel(stage.level);
  const subjectName = pick(SCHOOL_SUBJECTS[weakest.subject].name);

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
          {stage && monster && (
            <div className={styles.suggestedRow}>
              <CharacterPortrait character={monster} size={48} rim />
              <div>
                <b>{pick(monster.name)}</b>
                <span>{battleText.stage(subjectName, stage.chapter.number, battleText.levels[stage.level])}</span>
                <span>{text.suggestedWhy(subjectName, weakest.percent)}</span>
              </div>
              <PixelButton size="small" className={styles.fight} aria-label={`${battleText.fight}: ${battleText.stage(subjectName, stage.chapter.number, battleText.levels[stage.level])}`} onClick={() => onFight(stage)}>
                {battleText.fight}
              </PixelButton>
            </div>
          )}
        </div>
      </div>
    </PixelCard>
  );
}
