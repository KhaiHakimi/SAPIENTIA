'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { formatDuration } from '@/features/capacity/services/duration-text';
import { ApiError } from '@/shared/api/api-client';
import { describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay } from '@/shared/i18n/format-date';
import { useLanguage } from '@/shared/i18n/useLanguage';
import type { HomeworkPreviewRequest } from '../interfaces/homework.interface';
import type { HomeworkMessages } from '../i18n/homework-messages.interface';
import { fetchHomeworkPreview, homeworkPreviewKey } from '../services/homework.client';
import styles from '../styles/Homework.module.css';

interface HomeworkPreviewNoticeProps {
  text: HomeworkMessages;
  /** Null until a lesson and a due date are chosen. */
  request: HomeworkPreviewRequest | null;
}

/**
 * Before saving (stories S12-1 and S12-2): the class's homework that week, by date and subject only, a warning when this
 * would be the third or more due that day, and whether the marking time exists. It warns and never blocks. Announced
 * politely, in words, so it does not rely on colour.
 */
export function HomeworkPreviewNotice({ text, request }: HomeworkPreviewNoticeProps) {
  const { lang } = useLanguage();
  const check = useQuery({
    queryKey: request ? homeworkPreviewKey(request) : [...homeworkPreviewKey({ classId: '', subjectId: '', dueOn: '' }), 'idle'],
    queryFn: ({ signal }) => fetchHomeworkPreview(request as HomeworkPreviewRequest, signal),
    enabled: request !== null,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });

  if (!request) return null;
  if (check.isPending) return <p className={calm.help} role="status">{text.checking}</p>;
  if (check.isError) {
    // A date the server will refuse is explained here as well as on saving.
    const fields = check.error instanceof ApiError ? Object.values(check.error.fields) : [];
    const reason = fields[0] ? (text.fieldErrors[fields[0]] ?? describeFieldError(fields[0], lang)) : text.checkFailed;
    return <p className={calm.help} role="status">{reason}</p>;
  }

  const { week, sameDay, loadWarning, marking } = check.data;
  const day = (isoDay: string) => formatDay(isoDay, lang, { weekday: true });
  const duration = (minutes: number) => formatDuration(minutes, lang);

  return (
    <div className={styles.preview} role="status">
      <div className={`${calm.alert} ${loadWarning ? calm.alertInfo : calm.alertOk}`}>
        {loadWarning ? <strong>{text.loadWarning(sameDay)}</strong> : text.loadOk(sameDay)}
      </div>
      <h3 className={styles.previewTitle}>{text.weekTitle}</h3>
      {week.length === 0 ? (
        <p className={calm.muted}>{text.weekEmpty}</p>
      ) : (
        <ul className={styles.weekList}>
          {week.map((item, index) => (
            <li key={`${item.dueOn}-${item.subjectName}-${index}`} className={item.dueOn === request.dueOn ? styles.sameDay : undefined}>
              <span>{day(item.dueOn)}</span> <span className={calm.muted}>{item.subjectName}</span>
            </li>
          ))}
        </ul>
      )}
      {marking && (
        <div className={`${calm.alert} ${marking.feasible ? calm.alertOk : calm.alertInfo}`}>
          {marking.feasible
            ? text.markingFits(duration(marking.freeMinutes))
            : (
              <>
                <strong>{text.markingShort(duration(marking.neededMinutes), duration(marking.freeMinutes))}</strong>
                {marking.earliestDueOn && <> {text.markingEarliest(day(marking.earliestDueOn))}</>}
              </>
            )}
        </div>
      )}
    </div>
  );
}
