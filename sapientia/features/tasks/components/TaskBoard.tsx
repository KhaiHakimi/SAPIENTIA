'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { ASSIGNMENT_STATUSES } from '../constants/task.constants';
import type { AssignmentStatus } from '../interfaces/task.interface';
import type { TasksMessages } from '../i18n/tasks-messages.interface';
import { TASKS_MESSAGES } from '../i18n/tasks.messages';
import { boardKey, fetchBoardColumn } from '../services/tasks.client';
import styles from '../styles/Tasks.module.css';
import { StatusSelect } from './StatusSelect';

function BoardColumn({ status, text }: { status: AssignmentStatus; text: TasksMessages }) {
  const { lang } = useLanguage();
  const column = useInfiniteQuery({
    queryKey: boardKey(status),
    queryFn: ({ pageParam }) => fetchBoardColumn(status, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const cards = column.data?.pages.flatMap((page) => page.items) ?? [];
  const headingId = `column-${status}`;

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.columnTitle}>
        {text.statuses[status]} {column.isSuccess && <span className={calm.badge}>{cards.length}{column.hasNextPage ? '+' : ''}</span>}
      </h2>
      {column.isPending ? (
        <p className={calm.loading} role="status">{text.loading}</p>
      ) : column.isError ? (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(column.error, lang)}</div>
      ) : cards.length === 0 ? (
        <p className={calm.empty}>{text.columnEmpty}</p>
      ) : (
        <ul className={styles.cards}>
          {cards.map((card) => (
            <li key={card.id} className={styles.card}>
              <Link href={`/staff/tasks/${card.id}`} className={styles.cardTitle}>{card.title}</Link>
              <div className={calm.muted}>{text.due(formatDay(card.dueOn, lang))}</div>
              <div className={calm.muted}>{text.from(card.createdBy.name)}</div>
              <StatusSelect taskId={card.id} status={card.myStatus} text={text} idPrefix="board" />
            </li>
          ))}
        </ul>
      )}
      {column.hasNextPage && (
        <button type="button" className={`${calm.button} ${calm.small}`} onClick={() => column.fetchNextPage()} disabled={column.isFetchingNextPage}>
          {column.isFetchingNextPage ? text.loading : text.loadMore}
        </button>
      )}
    </section>
  );
}

/** The teacher board (plan Sprint 3): four columns of the caller's own assignments, soonest due first. */
export function TaskBoard() {
  const text = useMessages(TASKS_MESSAGES);
  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.boardTitle}</h1>
          <p>{text.boardIntro}</p>
        </div>
      </div>
      <div className={styles.board}>
        {ASSIGNMENT_STATUSES.map((status) => <BoardColumn key={status} status={status} text={text} />)}
      </div>
    </>
  );
}
