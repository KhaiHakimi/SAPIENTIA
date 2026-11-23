'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { TASKS_KEY } from '@/features/tasks/services/tasks.client';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { EXTENSIONS_MESSAGES } from '../i18n/extensions.messages';
import type { ExtensionDecision, ExtensionRequest } from '../interfaces/extension.interface';
import { earliestExtensionDay } from '../services/extension-dates';
import { answerExtension } from '../services/extensions.client';
import styles from '../styles/Extensions.module.css';

/**
 * The sender's answer to one open request: approve the date asked for with one button, or set a different later date.
 * There is no "refuse": the plan gives the sender two answers, and either one moves the teacher's due date. A date asked
 * for that has gone by the time of the answer cannot be approved; the sender sets another. `today` is the school's date.
 */
export function ExtensionAnswer({ taskId, request, today }: { taskId: string; request: ExtensionRequest; today: string }) {
  const text = useMessages(EXTENSIONS_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [otherDate, setOtherDate] = useState('');
  const answer = useMutation({
    mutationFn: (decision: ExtensionDecision) => answerExtension(taskId, request.id, decision),
    // Also after a failure: a 409 means someone has answered already, and the fresh task shows that answer.
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
  const dateReason = answer.error instanceof ApiError ? answer.error.fields.dueOn : undefined;
  const dateError = dateReason && (text.fieldErrors[dateReason] ?? describeFieldError(dateReason, lang));
  const inputId = `extension-other-${request.id}`;

  return (
    <div>
      <div className={styles.actions}>
        <button type="button" className={`${calm.button} ${calm.primary} ${calm.small}`} disabled={answer.isPending || request.requestedDueOn < today}
          onClick={() => answer.mutate({ decision: 'approve' })}>
          {answer.isPending ? text.saving : text.approve(formatDay(request.requestedDueOn, lang))}
        </button>
        <div>
          <label className={calm.label} htmlFor={inputId}>{text.otherDate}</label>
          <input id={inputId} type="date" className={calm.input} value={otherDate} min={earliestExtensionDay(request.currentDueOn, today)}
            onChange={(event) => setOtherDate(event.target.value)} aria-invalid={Boolean(dateError)} aria-describedby={`${inputId}-error`} />
        </div>
        <button type="button" className={`${calm.button} ${calm.small}`} disabled={answer.isPending || otherDate === ''}
          onClick={() => answer.mutate({ decision: 'propose', dueOn: otherDate })}>
          {text.setOtherDate}
        </button>
      </div>
      <div id={`${inputId}-error`} className={calm.fieldError} role={answer.isError ? 'alert' : undefined}>
        {dateError ?? (answer.isError ? describeApiError(answer.error, lang) : '')}
      </div>
    </div>
  );
}
