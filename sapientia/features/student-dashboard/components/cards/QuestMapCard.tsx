'use client';

import { PixelButton } from '@/shared/components/PixelButton';
import { PixelCard } from '@/shared/components/PixelCard';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { SegmentedBar } from '@/shared/components/SegmentedBar';
import { formatDayShort } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { GUARDIAN_BONUS_XP } from '../../constants/progress.constants';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import type { Quest } from '../../interfaces/quest.interface';
import { doneCount, isQuestDone } from '../../services/progress.service';
import { dueStatus } from '../../services/quest.service';
import styles from '../../styles/QuestMap.module.css';

interface QuestMapCardProps {
  className?: string;
  onOpenQuest: (questId: string) => void;
  onToggleQuest: (questId: string) => void;
}

/** The class's homework as rooms on a map, then This Week's Guardian, which only falls once every room is cleared. */
export function QuestMapCard({ className, onOpenQuest, onToggleQuest }: QuestMapCardProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { quests, questsStatus, done, guardianDefeated, guardianHpPercent } = useStudentProgress();
  const guardianTitleId = 'guardian-name';

  let rooms;
  if (questsStatus === 'error') rooms = <p className={styles.status} role="alert">{text.questsError}</p>;
  else if (questsStatus === 'loading') rooms = <p className={styles.status}>{text.questsLoading}</p>;
  else if (quests.length === 0) rooms = <p className={styles.status}>{text.questsEmpty}</p>;
  else {
    rooms = (
      <ol className={styles.map}>
        {quests.map((quest, index) => (
          <QuestRoom
            key={quest.id}
            quest={quest}
            number={index + 1}
            isDone={isQuestDone(quest, done)}
            onOpen={onOpenQuest}
            onToggle={onToggleQuest}
          />
        ))}
      </ol>
    );
  }

  return (
    <PixelCard id="quests" title={text.questMap} icon="door" aside={text.questCount(doneCount(quests, done), quests.length)} className={className}>
      {rooms}
      {quests.length > 0 && (
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
      )}
    </PixelCard>
  );
}

interface QuestRoomProps {
  quest: Quest;
  number: number;
  isDone: boolean;
  onOpen: (questId: string) => void;
  onToggle: (questId: string) => void;
}

/** One room. A hand-in the teacher recorded is cleared for good, so it has no button; the pupil's own tick can be undone. */
function QuestRoom({ quest, number, isDone, onOpen, onToggle }: QuestRoomProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { lang } = useLanguage();
  const { clock } = useStudentProgress();
  const status = dueStatus(quest.dueOn, clock.today);
  const action = isDone ? text.undo : text.markDone;
  const urgent = !isDone && (status === 'today' || status === 'overdue');
  let tag = text.due(status, formatDayShort(quest.dueOn, lang));
  if (quest.handedIn) tag = text.handedIn;
  else if (isDone) tag = text.cleared;

  return (
    // The whole row opens the scroll; the title button covers keyboard users and the mark button keeps its own action.
    <li
      className={[styles.room, isDone && styles.cleared].filter(Boolean).join(' ')}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('button')) onOpen(quest.id);
      }}
    >
      <div className={styles.tile} aria-hidden="true">
        {isDone ? <PixelSprite name="check" scale={4} /> : <PixelSprite name="door" scale={3} />}
      </div>
      <div>
        <div className={styles.roomName}>{text.room(number)}</div>
        <div className={styles.roomTitle}>
          <button type="button" className={styles.open} aria-haspopup="dialog" onClick={() => onOpen(quest.id)}>
            {quest.title}
          </button>
        </div>
        <div className={styles.meta}>
          {/* Status is text as well as colour (accessibility is not themeable). */}
          <span className={[styles.tag, isDone ? styles.ok : urgent && styles.urgent].filter(Boolean).join(' ')}>{tag}</span>
          {quest.subjectName}
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
      {!quest.handedIn && (
        <PixelButton variant={isDone ? 'ghost' : 'primary'} className={styles.mark} aria-label={`${action}: ${quest.title}`} onClick={() => onToggle(quest.id)}>
          {action}
        </PixelButton>
      )}
    </li>
  );
}
