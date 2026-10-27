'use client';

import { PixelButton } from '@/shared/components/PixelButton';
import { PixelCard } from '@/shared/components/PixelCard';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { SegmentedBar } from '@/shared/components/SegmentedBar';
import { SCHOOL_SUBJECTS } from '@/shared/data/school-subjects';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { GUARDIAN_BONUS_XP } from '../../constants/progress.constants';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import { doneCount, isQuestDone } from '../../services/progress.service';
import styles from '../../styles/QuestMap.module.css';

interface QuestMapCardProps {
  className?: string;
  onOpenQuest: (questId: string) => void;
  onToggleQuest: (questId: string) => void;
}

/** Homework as rooms on a map, then This Week's Guardian, which only falls once every room is cleared. */
export function QuestMapCard({ className, onOpenQuest, onToggleQuest }: QuestMapCardProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { pick } = useLanguage();
  const { quests, done, guardianDefeated, guardianHpPercent } = useStudentProgress();
  const guardianTitleId = 'guardian-name';

  return (
    <PixelCard id="quests" title={text.questMap} icon="door" aside={text.questCount(doneCount(quests, done), quests.length)} className={className}>
      <ol className={styles.map}>
        {quests.map((quest, index) => {
          const isDone = isQuestDone(quest, done);
          const title = pick(quest.title);
          const action = isDone ? text.undo : text.markDone;
          return (
            // The whole row opens the scroll; the title button covers keyboard users and the mark button keeps its own action.
            <li
              key={quest.id}
              className={[styles.room, isDone && styles.cleared].filter(Boolean).join(' ')}
              onClick={(event) => {
                if (!(event.target as HTMLElement).closest('button')) onOpenQuest(quest.id);
              }}
            >
              <div className={styles.tile} aria-hidden="true">
                {isDone ? <PixelSprite name="check" scale={4} /> : <PixelSprite name="door" scale={3} />}
              </div>
              <div>
                <div className={styles.roomName}>{text.room(index + 1)}</div>
                <div className={styles.roomTitle}>
                  <button type="button" className={styles.open} aria-haspopup="dialog" onClick={() => onOpenQuest(quest.id)}>
                    {title}
                  </button>
                </div>
                <div className={styles.meta}>
                  {/* Status is text as well as colour (accessibility is not themeable). */}
                  <span className={[styles.tag, isDone ? styles.ok : quest.due === 'today' && styles.urgent].filter(Boolean).join(' ')}>
                    {isDone ? text.cleared : text.due[quest.due]}
                  </span>
                  {pick(SCHOOL_SUBJECTS[quest.subject].name)}
                </div>
                <div className={styles.loot}>
                  +{quest.xp} XP
                  <PixelSprite name="coin" scale={2} />
                  {quest.coins}
                  <span className={styles.hint} aria-hidden="true">
                    {text.viewDetails} &gt;
                  </span>
                </div>
              </div>
              <PixelButton variant={isDone ? 'ghost' : 'primary'} className={styles.mark} aria-label={`${action}: ${title}`} onClick={() => onToggleQuest(quest.id)}>
                {action}
              </PixelButton>
            </li>
          );
        })}
      </ol>
      <div className={[styles.guardian, guardianDefeated && styles.down].filter(Boolean).join(' ')}>
        <div className={styles.tile} aria-hidden="true">
          <PixelSprite name="skull" scale={4} className={styles.skull} />
        </div>
        <div>
          <b id={guardianTitleId}>{text.guardianName}</b>
          <SegmentedBar percent={guardianHpPercent} tone="boss" aria-labelledby={guardianTitleId} aria-valuetext={text.guardianHp(guardianHpPercent)} />
          <p>{guardianDefeated ? text.guardianDown(GUARDIAN_BONUS_XP) : `${text.guardianHp(guardianHpPercent)}. ${text.guardianSealed}`}</p>
        </div>
      </div>
    </PixelCard>
  );
}
