'use client';

import { PixelButton } from '@/shared/components/PixelButton';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { ScrollDialog, scrollStyles } from '@/shared/components/ScrollDialog';
import { formatDayShort } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import { isQuestDone } from '../../services/progress.service';
import { dueStatus } from '../../services/quest.service';

interface QuestScrollDialogProps {
  /** The quest to show; null keeps the scroll closed. */
  questId: string | null;
  onClose: () => void;
  /** Mark done or undo. Called after the scroll closes, so the coin burst and toast are not hidden behind it. */
  onToggle: (questId: string) => void;
}

/** The teacher's homework in full, on a parchment scroll. */
export function QuestScrollDialog({ questId, onClose, onToggle }: QuestScrollDialogProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { lang } = useLanguage();
  const { quests, done, clock } = useStudentProgress();
  const index = quests.findIndex((quest) => quest.id === questId);
  const quest = index >= 0 ? quests[index] : null;
  const isDone = quest ? isQuestDone(quest, done) : false;

  return (
    <ScrollDialog
      open={quest !== null}
      onClose={onClose}
      eyebrow={quest ? `${text.room(index + 1)} • ${quest.subjectName}` : ''}
      title={quest ? quest.title : ''}
      closeLabel={text.close}
      actions={
        quest && (
          <>
            <PixelButton variant="ghost" onClick={onClose}>
              {text.close}
            </PixelButton>
            {!quest.handedIn && (
              <PixelButton
                variant={isDone ? 'ghost' : 'primary'}
                onClick={() => {
                  onClose();
                  onToggle(quest.id);
                }}
              >
                {isDone ? text.undo : text.markDone}
              </PixelButton>
            )}
          </>
        )
      }
    >
      {quest && (
        <>
          <dl className={scrollStyles.meta}>
            <div>
              <dt>{text.scrollFrom}</dt>
              <dd>{quest.teacherName}</dd>
            </div>
            <div>
              <dt>{text.scrollDue}</dt>
              <dd>{text.due(dueStatus(quest.dueOn, clock.today), formatDayShort(quest.dueOn, lang))}</dd>
            </div>
            <div>
              <dt>{text.scrollReward}</dt>
              <dd>
                +{quest.xp} XP
                <PixelSprite name="coin" scale={2} />
                {quest.coins}
              </dd>
            </div>
          </dl>
          <h4 className={scrollStyles.subhead}>{text.scrollMessage}</h4>
          <p className={scrollStyles.typed}>{quest.details ?? text.scrollNoDetails}</p>
          {quest.comments.length > 0 && (
            <>
              <h4 className={scrollStyles.subhead}>{text.scrollComments(quest.teacherName)}</h4>
              <ul className={scrollStyles.notes}>
                {quest.comments.map((comment) => <li key={comment.id} className={scrollStyles.typed}>{comment.body}</li>)}
              </ul>
            </>
          )}
          <h4 className={scrollStyles.subhead}>{text.scrollHandIn}</h4>
          <p>{quest.handedIn ? text.scrollHandedIn : text.scrollHandInNote}</p>
        </>
      )}
    </ScrollDialog>
  );
}
