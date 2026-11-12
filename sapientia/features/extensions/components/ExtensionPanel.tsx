'use client';

import { useState } from 'react';
import { formatDuration } from '@/features/capacity/services/duration-text';
import { useStaffUser } from '@/features/staff/hooks/useStaffUser';
import type { TaskDetail } from '@/features/tasks/interfaces/task.interface';
import calm from '@/shared/calm/Calm.module.css';
import { formatDate, formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { ExtensionsMessages } from '../i18n/extensions-messages.interface';
import { EXTENSIONS_MESSAGES } from '../i18n/extensions.messages';
import type { ExtensionRequest } from '../interfaces/extension.interface';
import styles from '../styles/Extensions.module.css';
import { ExtensionAnswer } from './ExtensionAnswer';
import { ExtensionRequestForm } from './ExtensionRequestForm';

function describeOutcome(request: ExtensionRequest, text: ExtensionsMessages, lang: Lang): string {
  if (request.status === 'pending' || !request.decidedBy || !request.decidedDueOn) return text.pending;
  const day = formatDay(request.decidedDueOn, lang, { weekday: true });
  return (request.status === 'approved' ? text.approved : text.countered)(request.decidedBy.name, day);
}

/**
 * Requests for more time on one task and their answers, kept on the task (plan Phase 2). An assignee sees their own
 * requests and can ask; the sender sees everyone's and answers the open ones. Nothing is shown when there is nothing to
 * show and nothing to ask.
 */
export function ExtensionPanel({ task }: { task: TaskDetail }) {
  const text = useMessages(EXTENSIONS_MESSAGES);
  const { lang } = useLanguage();
  const user = useStaffUser();
  const [asking, setAsking] = useState(false);

  const hasOpenRequest = task.extensions.some((request) => request.status === 'pending' && request.requestedBy.id === user.id);
  const canAsk = task.myDueOn !== null && task.myStatus !== null && task.myStatus !== 'done' && task.deliveredAt !== null && !hasOpenRequest;
  if (task.extensions.length === 0 && !canAsk) return null;
  const duration = (minutes: number) => formatDuration(minutes, lang);

  return (
    <section className={calm.card} aria-labelledby="extensions-title">
      <h2 id="extensions-title">{text.title}</h2>
      {task.extensions.length > 0 && (
        <ul className={styles.list}>
          {task.extensions.map((request) => (
            <li key={request.id} className={styles.item}>
              <p>
                {text.asked(
                  request.requestedBy.name,
                  formatDate(request.createdAt, lang, { withTime: true }),
                  formatDay(request.currentDueOn, lang),
                  formatDay(request.requestedDueOn, lang),
                )}
              </p>
              {request.neededMinutes !== null && request.freeMinutes !== null && (
                <p className={calm.muted}>{text.askedFigures(duration(request.neededMinutes), duration(request.freeMinutes))}</p>
              )}
              {request.reason && <p className={styles.reason}>{request.reason}</p>}
              <p>
                <span className={`${calm.badge} ${request.status === 'pending' ? calm.badgeAccent : calm.badgeOk}`}>
                  {describeOutcome(request, text, lang)}
                </span>
              </p>
              {task.isSender && request.status === 'pending' && <ExtensionAnswer taskId={task.id} request={request} />}
            </li>
          ))}
        </ul>
      )}
      {canAsk && task.myDueOn !== null && (
        asking
          ? <ExtensionRequestForm taskId={task.id} dueOn={task.myDueOn} onClose={() => setAsking(false)} />
          : <button type="button" className={calm.button} onClick={() => setAsking(true)}>{text.ask}</button>
      )}
    </section>
  );
}
