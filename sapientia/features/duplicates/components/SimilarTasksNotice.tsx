'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import calm from '@/shared/calm/Calm.module.css';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { SIMILAR_DEBOUNCE_MS } from '../constants/duplicates.constants';
import { DUPLICATES_MESSAGES } from '../i18n/duplicates.messages';
import { fetchSimilarTasks, similarTasksKey } from '../services/duplicates.client';

/** Titles shorter than this match too much to be worth a warning. */
const TITLE_MIN = 4;

interface SimilarTasksNoticeProps {
  title: string;
  assigneeIds: string[];
}

/**
 * Duplicate detection on the create-task form (plan Phase 6): once typing pauses, open tasks that look like this one are
 * listed. It warns and never blocks, and says nothing at all when there is no match or the check fails.
 */
export function SimilarTasksNotice({ title, assigneeIds }: SimilarTasksNoticeProps) {
  const text = useMessages(DUPLICATES_MESSAGES);
  const { lang } = useLanguage();
  // Strings, not an object: a new object every render would never settle.
  const settledTitle = useDebouncedValue(title.trim(), SIMILAR_DEBOUNCE_MS);
  const settledIds = useDebouncedValue([...assigneeIds].sort().join(','), SIMILAR_DEBOUNCE_MS);
  const request = { title: settledTitle, assigneeIds: settledIds ? settledIds.split(',') : [] };
  const enabled = request.title.length >= TITLE_MIN;
  const check = useQuery({
    queryKey: similarTasksKey(request),
    queryFn: ({ signal }) => fetchSimilarTasks(request, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const items = enabled ? check.data?.items ?? [] : [];
  if (items.length === 0) return null;
  return (
    <div className={`${calm.alert} ${calm.alertInfo}`} role="status">
      <strong>{text.title(items.length)}</strong>
      <ul>
        {items.map((item, index) => (
          <li key={item.taskId ?? `${item.title}-${index}`}>
            {item.taskId ? <Link href={`/staff/tasks/${item.taskId}`}>{item.title}</Link> : <span>{item.title}</span>}{' '}
            <span className={calm.muted}>
              ({[
                item.sentBy.isMe ? text.sentByMe : text.sentBy(item.sentBy.name),
                text.due(formatDay(item.dueOn, lang, { weekday: true })),
                text.shared(item.sharedAssignees),
              ].filter(Boolean).join(', ')})
            </span>
          </li>
        ))}
      </ul>
      <p className={calm.help}>{text.stillSend}</p>
    </div>
  );
}
