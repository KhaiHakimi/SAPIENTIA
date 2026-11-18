'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { formatDuration } from '@/features/capacity/services/duration-text';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay } from '@/shared/i18n/format-date';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { Homework } from '../interfaces/homework.interface';
import type { HomeworkMessages } from '../i18n/homework-messages.interface';
import { HOMEWORK_ROOT_KEY, removeHomework, setHomeworkMarked } from '../services/homework.client';
import styles from '../styles/Homework.module.css';
import { CommentsPanel } from './CommentsPanel';
import { HandInPanel } from './HandInPanel';

interface HomeworkItemProps {
  text: HomeworkMessages;
  homework: Homework;
  timeZone: string;
}

/** One piece of the teacher's homework: when it is due, hand-ins so far, marking, and the actions on it. */
export function HomeworkItem({ text, homework, timeZone }: HomeworkItemProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [handInsOpen, setHandInsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: HOMEWORK_ROOT_KEY });
  const mark = useMutation({ mutationFn: (marked: boolean) => setHomeworkMarked(homework.id, marked), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => removeHomework(homework.id), onSuccess: refresh });
  const failure = mark.error ?? remove.error;
  const panelId = `hand-ins-${homework.id}`;
  const commentsId = `comments-${homework.id}`;

  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        <h3 className={styles.itemTitle}>{homework.title}</h3>
        <span className={calm.muted}>{text.lessonName(homework.class.name, homework.subject.name)}</span>
      </div>
      <p className={styles.meta}>
        <span>{text.due(formatDay(homework.dueOn, lang, { weekday: true }))}</span>
        <span>{text.handedIn(homework.handedInCount, homework.pupilCount)}</span>
        {homework.loadFlagged && <span className={`${calm.badge} ${calm.badgeAccent}`}>{text.flagged}</span>}
        {homework.markingMinutes !== null && homework.markBy !== null && (homework.marked
          ? <span className={`${calm.badge} ${calm.badgeOk}`}>{text.markedBadge}</span>
          : <span>{text.marking(formatDuration(homework.markingMinutes, lang), formatDay(homework.markBy, lang))}</span>)}
      </p>
      {homework.details && <p className={styles.details}>{homework.details}</p>}
      {failure && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(failure, lang)}</div>}

      <div className={styles.actions}>
        <button type="button" className={`${calm.button} ${calm.small}`} aria-expanded={handInsOpen} aria-controls={panelId}
          onClick={() => setHandInsOpen((open) => !open)}>
          {handInsOpen ? text.hideHandIns : text.handInsButton(homework.title)}
        </button>
        <button type="button" className={`${calm.button} ${calm.small}`} aria-expanded={commentsOpen} aria-controls={commentsId}
          onClick={() => setCommentsOpen((open) => !open)}>
          {commentsOpen ? text.hideComments : text.commentsButton(homework.title)}
        </button>
        {homework.markingMinutes !== null && (
          <button type="button" className={`${calm.button} ${calm.small}`} disabled={mark.isPending} onClick={() => mark.mutate(!homework.marked)}>
            {homework.marked ? text.markUndo : text.markDone}
          </button>
        )}
        {confirming ? (
          <>
            <button type="button" className={`${calm.button} ${calm.small} ${calm.danger}`} disabled={remove.isPending}
              onClick={() => remove.mutate()}>
              {text.removeConfirm}
            </button>
            <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => setConfirming(false)}>{text.removeCancel}</button>
          </>
        ) : (
          <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => setConfirming(true)}>{text.remove}</button>
        )}
      </div>
      <div id={panelId} hidden={!handInsOpen}>
        {handInsOpen && <HandInPanel text={text} homeworkId={homework.id} />}
      </div>
      <div id={commentsId} hidden={!commentsOpen}>
        {commentsOpen && <CommentsPanel text={text} homeworkId={homework.id} timeZone={timeZone} />}
      </div>
    </li>
  );
}
