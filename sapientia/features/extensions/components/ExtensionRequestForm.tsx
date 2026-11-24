'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { CAPACITY_MESSAGES } from '@/features/capacity/i18n/capacity.messages';
import { formatDuration } from '@/features/capacity/services/duration-text';
import { TASKS_KEY } from '@/features/tasks/services/tasks.client';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay } from '@/shared/i18n/format-date';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { EXTENSION_REASON_MAX } from '../constants/extension.constants';
import { EXTENSIONS_MESSAGES } from '../i18n/extensions.messages';
import { earliestExtensionDay, suggestedDueOn } from '../services/extension-dates';
import { extensionSuggestionKey, fetchExtensionSuggestion, requestExtension } from '../services/extensions.client';
import styles from '../styles/Extensions.module.css';

interface ExtensionRequestFormProps {
  taskId: string;
  /** The assignee's own due date now. */
  dueOn: string;
  /** The school's date today: overdue work cannot be extended to a day already gone. */
  today: string;
  onClose: () => void;
}

/**
 * The assignee's request for more time (plan Phase 2). It opens already filled in: their own free-time figures for this
 * task and the earliest date the work fits, so sending is one more tap. The date can be changed and a reason is optional.
 */
export function ExtensionRequestForm({ taskId, dueOn, today, onClose }: ExtensionRequestFormProps) {
  const text = useMessages(EXTENSIONS_MESSAGES);
  const capacity = useMessages(CAPACITY_MESSAGES);
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  // Free time changes as the day goes on, so the figures are worked out afresh each time the form opens.
  const suggestion = useQuery({ queryKey: extensionSuggestionKey(taskId), queryFn: () => fetchExtensionSuggestion(taskId), staleTime: 0 });
  // Null until the teacher picks a date themselves; until then the form follows the suggestion.
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const figures = suggestion.data?.feasibility ?? null;
  const earliestDay = earliestExtensionDay(dueOn, today);
  const suggested = suggestedDueOn(dueOn, figures, today);
  const requestedDueOn = chosenDate ?? suggested;

  const send = useMutation({
    mutationFn: () => requestExtension(taskId, { requestedDueOn, reason: reason.trim() || undefined }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      onClose();
    },
  });
  const fields = send.error instanceof ApiError ? send.error.fields : {};
  const dateError = fields.requestedDueOn && (text.fieldErrors[fields.requestedDueOn] ?? describeFieldError(fields.requestedDueOn, lang));
  const duration = (minutes: number) => formatDuration(minutes, lang);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send.mutate();
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <p>{text.currentDue(formatDay(dueOn, lang, { weekday: true }))}</p>
      <div role="status">
        {suggestion.isPending ? (
          <p className={calm.help}>{text.figuresLoading}</p>
        ) : suggestion.isError ? (
          <p className={calm.help}>{text.figuresFailed}</p>
        ) : figures === null ? (
          <p className={calm.help}>{text.noEstimate}</p>
        ) : (
          <div className={`${calm.alert} ${figures.feasible ? '' : calm.alertInfo}`}>
            <strong>
              {(figures.feasible ? text.figuresFit : text.figuresShort)(duration(figures.neededMinutes), duration(figures.freeMinutes))}
            </strong>
            <p className={calm.help}>{capacity.breakdown(duration(figures.teachingMinutes), duration(figures.committedMinutes))}</p>
            {suggested !== earliestDay && <p className={calm.help}>{text.suggested(formatDay(suggested, lang, { weekday: true }))}</p>}
          </div>
        )}
      </div>

      <div className={calm.field}>
        <label className={calm.label} htmlFor="extension-date">{text.newDate}</label>
        <input id="extension-date" type="date" className={calm.input} value={requestedDueOn} min={earliestDay}
          onChange={(event) => setChosenDate(event.target.value)} aria-invalid={Boolean(dateError)} aria-describedby="extension-date-error" />
        <div id="extension-date-error" className={calm.fieldError} role={dateError ? 'alert' : undefined}>{dateError ?? ''}</div>
      </div>

      <div className={calm.field}>
        <label className={calm.label} htmlFor="extension-reason">{text.reason} <span className={calm.muted}>({text.optional})</span></label>
        <textarea id="extension-reason" className={calm.textarea} value={reason} maxLength={EXTENSION_REASON_MAX}
          onChange={(event) => setReason(event.target.value)} aria-describedby="extension-reason-help" />
        <div id="extension-reason-help" className={calm.help}>{text.reasonHelp}</div>
      </div>

      {send.isError && !dateError && (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(send.error, lang)}</div>
      )}
      <div className={styles.actions}>
        <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={send.isPending || requestedDueOn === ''}>
          {send.isPending ? text.sending : text.send}
        </button>
        <button type="button" className={calm.button} onClick={onClose} disabled={send.isPending}>{text.cancel}</button>
      </div>
    </form>
  );
}
