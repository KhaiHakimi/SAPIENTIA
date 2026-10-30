'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate, formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { TASKS_MESSAGES } from '../i18n/tasks.messages';
import { fetchSentTasks, SENT_KEY } from '../services/tasks.client';
import styles from '../styles/Tasks.module.css';

/** Senders: what they sent and how far along it is, newest first. */
export function SentTasksPage() {
  const text = useMessages(TASKS_MESSAGES);
  const { lang } = useLanguage();
  const sent = useInfiniteQuery({
    queryKey: SENT_KEY,
    queryFn: ({ pageParam }) => fetchSentTasks(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const rows = sent.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.sentTitle}</h1>
          <p>{text.sentIntro}</p>
        </div>
        <Link href="/staff/tasks/new" className={`${calm.button} ${calm.primary}`}>{text.newTask}</Link>
      </div>
      <section className={calm.card}>
        {sent.isPending ? (
          <p className={calm.loading} role="status">{text.loading}</p>
        ) : sent.isError ? (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(sent.error, lang)}</div>
        ) : rows.length === 0 ? (
          <p className={calm.empty}>{text.sentEmpty}</p>
        ) : (
          <div className={calm.tableWrap}>
            <table className={calm.table}>
              <thead>
                <tr>
                  <th scope="col">{text.columns.title}</th>
                  <th scope="col">{text.columns.due}</th>
                  <th scope="col">{text.columns.progress}</th>
                  <th scope="col">{text.columns.created}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((task) => (
                  <tr key={task.id}>
                    <td className={styles.titleCell}><Link href={`/staff/tasks/${task.id}`}>{task.title}</Link></td>
                    <td>{formatDay(task.dueOn, lang)}</td>
                    <td>
                      <span className={`${calm.badge} ${task.doneCount === task.assigneeCount ? calm.badgeOk : ''}`}>
                        {text.progress(task.doneCount, task.assigneeCount)}
                      </span>
                    </td>
                    <td>{formatDate(task.createdAt, lang, { withTime: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sent.hasNextPage && (
          <p>
            <button type="button" className={calm.button} onClick={() => sent.fetchNextPage()} disabled={sent.isFetchingNextPage}>
              {sent.isFetchingNextPage ? text.loading : text.loadMore}
            </button>
          </p>
        )}
      </section>
    </>
  );
}
