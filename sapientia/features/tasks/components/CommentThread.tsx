'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate } from '@/shared/i18n/format-date';
import { useLanguage } from '@/shared/i18n/useLanguage';
import { COMMENT_MAX } from '../constants/task.constants';
import type { TaskComment } from '../interfaces/task.interface';
import type { TasksMessages } from '../i18n/tasks-messages.interface';
import { addComment, taskKey } from '../services/tasks.client';
import styles from '../styles/Tasks.module.css';

export function CommentThread({ taskId, comments, text }: { taskId: string; comments: TaskComment[]; text: TasksMessages }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const post = useMutation({
    mutationFn: (value: string) => addComment(taskId, value),
    onSuccess: () => {
      setBody('');
      return queryClient.invalidateQueries({ queryKey: taskKey(taskId) });
    },
  });
  const fieldError = post.error instanceof ApiError ? post.error.fields.body : undefined;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (body.trim()) post.mutate(body);
  };

  return (
    <section className={calm.card} aria-labelledby="comments-title">
      <h2 id="comments-title">{text.commentsTitle}</h2>
      {comments.length === 0 ? (
        <p className={calm.muted}>{text.commentsEmpty}</p>
      ) : (
        <ul className={styles.comments}>
          {comments.map((comment) => (
            <li key={comment.id} className={styles.comment}>
              <strong>{comment.author.name}</strong>{' '}
              <time className={calm.muted} dateTime={comment.createdAt}>{formatDate(comment.createdAt, lang, { withTime: true })}</time>
              <p>{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} noValidate>
        <label className={calm.label} htmlFor="comment-body">{text.commentLabel}</label>
        <textarea id="comment-body" className={calm.textarea} value={body} maxLength={COMMENT_MAX}
          onChange={(event) => setBody(event.target.value)} aria-invalid={Boolean(fieldError)} aria-describedby="comment-error" />
        <div id="comment-error" className={calm.fieldError} role={post.isError ? 'alert' : undefined}>
          {fieldError ? describeFieldError(fieldError, lang) : post.isError ? describeApiError(post.error, lang) : ''}
        </div>
        <button type="submit" className={calm.button} disabled={post.isPending || !body.trim()}>
          {post.isPending ? text.commentSending : text.commentSend}
        </button>
      </form>
    </section>
  );
}
