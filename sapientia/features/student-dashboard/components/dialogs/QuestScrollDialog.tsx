'use client';

import { PixelButton } from '@/shared/components/PixelButton';
import { PixelSprite } from '@/shared/components/PixelSprite';
import { ScrollDialog, scrollStyles } from '@/shared/components/ScrollDialog';
import { SCHOOL_SUBJECTS } from '@/shared/data/school-subjects';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { useStudentProgress } from '../../hooks/useStudentProgress';
import { DASHBOARD_MESSAGES } from '../../i18n/dashboard.messages';
import { isQuestDone } from '../../services/progress.service';

interface QuestScrollDialogProps {
  /** The quest to show; null keeps the scroll closed. */
  questId: string | null;
  onClose: () => void;
  /** Mark done or undo. Called after the scroll closes, so the coin burst and toast are not hidden behind it. */
  onToggle: (questId: string) => void;
}

/** The teacher's full message for one quest, on a parchment scroll. */
export function QuestScrollDialog({ questId, onClose, onToggle }: QuestScrollDialogProps) {
  const text = useMessages(DASHBOARD_MESSAGES);
  const { lang, pick } = useLanguage();
  const { quests, done } = useStudentProgress();
  const index = quests.findIndex((quest) => quest.id === questId);
  const quest = index >= 0 ? quests[index] : null;
  const isDone = quest ? isQuestDone(quest, done) : false;

  return (
    <ScrollDialog
      open={quest !== null}
      onClose={onClose}
      eyebrow={quest ? `${text.room(index + 1)} • ${pick(SCHOOL_SUBJECTS[quest.subject].name)}` : ''}
      title={quest ? pick(quest.title) : ''}
      closeLabel={text.close}
      actions={
        quest && (
          <>
            <PixelButton variant="ghost" onClick={onClose}>
              {text.close}
            </PixelButton>
            <PixelButton
              variant={isDone ? 'ghost' : 'primary'}
              onClick={() => {
                onClose();
                onToggle(quest.id);
              }}
            >
              {isDone ? text.undo : text.markDone}
            </PixelButton>
          </>
        )
      }
    >
      {quest && (
        <>
          <dl className={scrollStyles.meta}>
            <div>
              <dt>{text.scrollFrom}</dt>
              <dd>{pick(quest.teacher)}</dd>
            </div>
            <div>
              <dt>{text.scrollDue}</dt>
              <dd>{isDone ? text.cleared : text.due[quest.due]}</dd>
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
          <p>{pick(quest.description)}</p>
          <h4 className={scrollStyles.subhead}>{text.scrollHandIn}</h4>
          <ul className={scrollStyles.list}>
            {quest.steps[lang].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </>
      )}
    </ScrollDialog>
  );
}
