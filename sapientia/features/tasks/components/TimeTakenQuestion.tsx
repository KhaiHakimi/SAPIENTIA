'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { describeApiError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage } from '@/shared/i18n/useLanguage';
import { TIME_TAKEN_OPTIONS } from '../constants/task.constants';
import type { TimeTaken } from '../interfaces/task.interface';
import type { TasksMessages } from '../i18n/tasks-messages.interface';
import { setMyTimeTaken, taskKey } from '../services/tasks.client';
import styles from '../styles/Tasks.module.css';

/**
 * The optional completion question (plan Phase 2), shown once the caller's own task is done: roughly how long it took.
 * Three toggle buttons; pressing the chosen one again takes the answer back. Skipping it changes nothing.
 */
export function TimeTakenQuestion({ taskId, answer, text }: { taskId: string; answer: TimeTaken | null; text: TasksMessages }) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (timeTaken: TimeTaken | null) => setMyTimeTaken(taskId, timeTaken),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKey(taskId) }),
  });
  // While saving, show the choice just made rather than the one still on the page.
  const shown = save.isPending && save.variables !== undefined ? save.variables : answer;

  return (
    <fieldset className={calm.fieldset} aria-describedby="time-taken-help time-taken-state">
      <legend>{text.timeTaken.question} <span className={calm.muted}>({text.optional})</span></legend>
      <div className={styles.choices}>
        {TIME_TAKEN_OPTIONS.map((option) => (
          <button key={option} type="button" className={`${calm.button} ${calm.small} ${shown === option ? calm.primary : ''}`}
            aria-pressed={shown === option} disabled={save.isPending} onClick={() => save.mutate(shown === option ? null : option)}>
            {text.timeTaken.options[option]}
          </button>
        ))}
      </div>
      <div id="time-taken-help" className={calm.help}>{text.timeTaken.help}</div>
      <div id="time-taken-state" className={save.isError ? calm.fieldError : calm.help} aria-live="polite">
        {save.isPending ? text.moving : save.isError ? describeApiError(save.error, lang) : save.isSuccess ? text.timeTaken.saved : ''}
      </div>
    </fieldset>
  );
}
