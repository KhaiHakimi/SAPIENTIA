'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage } from '@/shared/i18n/useLanguage';
import { HOMEWORK_COMMENT_MAX } from '../constants/homework.constants';
import type { HomeworkMessages } from '../i18n/homework-messages.interface';
import { addComment, commentsKey, fetchComments, fetchHandIns, handInsKey, hideComment } from '../services/homework.client';
import styles from '../styles/Homework.module.css';

interface CommentsPanelProps {
  text: HomeworkMessages;
  homeworkId: string;
  timeZone: string;
}

/**
 * Story S14-3: a short note to one pupil about this homework, which the pupil and their guardians see. The pupil cannot
 * reply. A note is never edited or deleted; the teacher may hide it. Only the teacher who set the work sees this panel.
 */
export function CommentsPanel({ text, homeworkId, timeZone }: CommentsPanelProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const pupils = useQuery({ queryKey: handInsKey(homeworkId), queryFn: () => fetchHandIns(homeworkId) });
  const comments = useQuery({ queryKey: commentsKey(homeworkId), queryFn: () => fetchComments(homeworkId) });
  const [studentId, setStudentId] = useState('');
  const [body, setBody] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: commentsKey(homeworkId) });
  const send = useMutation({
    mutationFn: () => addComment(homeworkId, { studentId, body }),
    onSuccess: async () => {
      setBody('');
      await refresh();
    },
  });
  const hide = useMutation({ mutationFn: (commentId: string) => hideComment(homeworkId, commentId), onSuccess: refresh });
  const fields = send.error instanceof ApiError ? send.error.fields : {};
  const fieldText = (code: string | undefined) => (code ? (text.fieldErrors[code] ?? describeFieldError(code, lang)) : undefined);
  const pupilError = fieldText(fields.studentId);
  const bodyError = fieldText(fields.body);
  const otherFailure = send.isError && !fields.studentId && !fields.body;
  const id = (name: string) => `comment-${homeworkId}-${name}`;
  const names = new Map(pupils.data?.pupils.map((pupil) => [pupil.id, pupil.name]) ?? []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send.mutate();
  };

  return (
    <div className={styles.handIns}>
      <h3 className={styles.previewTitle}>{text.commentsTitle}</h3>
      <p className={calm.help}>{text.commentsHelp}</p>
      {comments.isPending || pupils.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : comments.isError || pupils.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(comments.error ?? pupils.error, lang)}</div>
      ) : (
        <>
          {comments.data.comments.length === 0 ? (
            <p className={calm.empty}>{text.commentsEmpty}</p>
          ) : (
            <ul className={styles.comments}>
              {comments.data.comments.map((comment) => (
                <li key={comment.id} className={comment.hidden ? styles.hiddenComment : undefined}>
                  <strong>{names.get(comment.studentId) ?? text.commentFormerPupil}</strong>
                  <span className={calm.muted}> · {formatDate(comment.createdAt, lang, { withTime: true, timeZone })}</span>
                  <div className={styles.commentBody}>{comment.body}</div>
                  {comment.hidden ? (
                    <span className={calm.badge}>{text.commentHidden}</span>
                  ) : (
                    <button type="button" className={`${calm.button} ${calm.small}`} disabled={hide.isPending}
                      onClick={() => hide.mutate(comment.id)}>
                      {text.commentHide}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {hide.isError && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(hide.error, lang)}</div>}
          <form onSubmit={onSubmit} noValidate>
            <div className={calm.field}>
              <label className={calm.label} htmlFor={id('pupil')}>{text.commentPupil}</label>
              <select id={id('pupil')} className={calm.select} value={studentId} onChange={(event) => setStudentId(event.target.value)}
                aria-invalid={pupilError ? true : undefined} aria-describedby={pupilError ? id('pupil-error') : undefined}>
                <option value="">{text.commentChoosePupil}</option>
                {pupils.data.pupils.map((pupil) => <option key={pupil.id} value={pupil.id}>{pupil.name}</option>)}
              </select>
              {pupilError && <p id={id('pupil-error')} className={calm.fieldError}>{pupilError}</p>}
            </div>
            <div className={calm.field}>
              <label className={calm.label} htmlFor={id('body')}>{text.commentBody}</label>
              <textarea id={id('body')} className={calm.textarea} rows={3} maxLength={HOMEWORK_COMMENT_MAX} value={body}
                onChange={(event) => setBody(event.target.value)} aria-invalid={bodyError ? true : undefined}
                aria-describedby={bodyError ? id('body-error') : id('body-help')} />
              {bodyError
                ? <p id={id('body-error')} className={calm.fieldError}>{bodyError}</p>
                : <p id={id('body-help')} className={calm.help}>{text.commentBodyHelp(HOMEWORK_COMMENT_MAX - body.length)}</p>}
            </div>
            <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={send.isPending}>
              {send.isPending ? text.commentSending : text.commentSend}
            </button>
            {send.isSuccess && <div className={`${calm.alert} ${calm.alertOk}`} role="status">{text.commentSent}</div>}
            {otherFailure && <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(send.error, lang)}</div>}
          </form>
        </>
      )}
    </div>
  );
}
