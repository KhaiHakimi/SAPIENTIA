'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate, formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { TaskDetail } from '../interfaces/task.interface';
import type { TasksMessages } from '../i18n/tasks-messages.interface';
import { TASKS_MESSAGES } from '../i18n/tasks.messages';
import { describeActivity } from '../services/activity-text';
import { fetchTask, taskKey } from '../services/tasks.client';
import styles from '../styles/Tasks.module.css';
import { CommentThread } from './CommentThread';
import { StatusSelect } from './StatusSelect';

function SenderPanels({ task, text }: { task: TaskDetail; text: TasksMessages }) {
  const { lang } = useLanguage();
  const assignees = task.assignees ?? [];
  return (
    <>
      <section className={calm.card} aria-labelledby="assignees-title">
        <h2 id="assignees-title">{text.assigneesTitle}</h2>
        <div className={calm.tableWrap}>
          <table className={calm.table}>
            <tbody>
              {assignees.map((person) => (
                <tr key={person.id}>
                  <th scope="row">{person.name}</th>
                  <td>
                    <span className={`${calm.badge} ${person.status === 'done' ? calm.badgeOk : ''}`}>{text.statuses[person.status]}</span>
                  </td>
                  <td className={calm.muted}>{person.completedAt ? text.completedAt(formatDate(person.completedAt, lang, { withTime: true })) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={calm.card} aria-labelledby="activity-title">
        <h2 id="activity-title">{text.activityTitle}</h2>
        <ol className={styles.activity}>
          {(task.activity ?? []).map((entry) => (
            <li key={entry.id}>
              <time dateTime={entry.createdAt}>{formatDate(entry.createdAt, lang, { withTime: true })}</time>
              {describeActivity(entry, assignees, text)}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/** One task: what, when, my status, comments; the sender also sees each assignee and the history. */
export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const text = useMessages(TASKS_MESSAGES);
  const { lang } = useLanguage();
  const task = useQuery({ queryKey: taskKey(id), queryFn: () => fetchTask(id) });

  return (
    <>
      <p><Link href="/staff">{text.back}</Link></p>
      {task.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : task.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(task.error, lang)}</div>
      ) : (
        <>
          <div className={calm.pageHeader}>
            <div>
              <h1>{task.data.title}</h1>
              <div className={styles.meta}>
                <span>{text.due(formatDay(task.data.dueOn, lang, { weekday: true }))}</span>
                <span>{text.sentBy(task.data.createdBy.name, formatDate(task.data.createdAt, lang, { withTime: true }))}</span>
                <span>{text.overall}: {text.progress(task.data.doneCount, task.data.assigneeCount)}</span>
              </div>
            </div>
          </div>
          <div className={calm.grid2}>
            <div>
              <section className={calm.card}>
                <p className={task.data.description ? styles.description : calm.muted}>{task.data.description ?? text.noDescription}</p>
                {task.data.myStatus && (
                  <StatusSelect taskId={task.data.id} status={task.data.myStatus} text={text} idPrefix="detail" />
                )}
              </section>
              <CommentThread taskId={task.data.id} comments={task.data.comments} text={text} />
            </div>
            {task.data.isSender && <div><SenderPanels task={task.data} text={text} /></div>}
          </div>
        </>
      )}
    </>
  );
}
