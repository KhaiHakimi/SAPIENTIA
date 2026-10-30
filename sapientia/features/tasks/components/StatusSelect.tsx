'use client';

import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import { ASSIGNMENT_STATUSES } from '../constants/task.constants';
import { useSetMyStatus } from '../hooks/useSetMyStatus';
import type { AssignmentStatus } from '../interfaces/task.interface';
import type { TasksMessages } from '../i18n/tasks-messages.interface';

interface StatusSelectProps {
  taskId: string;
  status: AssignmentStatus;
  text: TasksMessages;
  /** Unique per page: the board shows many selects at once. */
  idPrefix: string;
}

/** A labelled select rather than drag and drop, so moving a card works with a keyboard, a screen reader and a phone. */
export function StatusSelect({ taskId, status, text, idPrefix }: StatusSelectProps) {
  const { lang } = useLanguage();
  const move = useSetMyStatus(taskId);
  const id = `${idPrefix}-${taskId}`;
  return (
    <div>
      <label className={calm.label} htmlFor={id}>{text.moveTo}</label>
      <select
        id={id}
        className={`${calm.select} ${calm.small}`}
        value={move.isPending && move.variables ? move.variables : status}
        disabled={move.isPending}
        onChange={(event) => move.mutate(event.target.value as AssignmentStatus)}
        aria-describedby={`${id}-state`}
      >
        {ASSIGNMENT_STATUSES.map((option) => <option key={option} value={option}>{text.statuses[option]}</option>)}
      </select>
      <div id={`${id}-state`} className={move.isError ? calm.fieldError : calm.help} aria-live="polite">
        {move.isPending ? text.moving : move.isError ? describeApiError(move.error, lang) : ''}
      </div>
    </div>
  );
}
