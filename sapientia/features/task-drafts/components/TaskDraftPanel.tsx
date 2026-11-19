'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { INSTRUCTION_MAX } from '../constants/task-draft.constants';
import { TASK_DRAFTS_MESSAGES } from '../i18n/task-drafts.messages';
import type { TaskDraft } from '../interfaces/task-draft.interface';
import { AI_STATUS_KEY, fetchAiStatus, requestTaskDraft } from '../services/task-drafts.client';

interface TaskDraftPanelProps {
  /** Fills the create-task form; the person still checks it, chooses the people and presses Send. */
  onDraft: (draft: TaskDraft) => void;
}

/**
 * Instruction to task (plan Phase 6), folded away above the create-task form. It appears only when the server has AI
 * switched on, and only ever fills the form: a person always confirms.
 */
export function TaskDraftPanel({ onDraft }: TaskDraftPanelProps) {
  const text = useMessages(TASK_DRAFTS_MESSAGES);
  const { lang } = useLanguage();
  const status = useQuery({ queryKey: AI_STATUS_KEY, queryFn: fetchAiStatus, staleTime: 5 * 60_000 });
  const [instruction, setInstruction] = useState('');
  const draft = useMutation({
    mutationFn: () => requestTaskDraft({ instruction }),
    onSuccess: (result) => onDraft(result.draft),
  });

  if (!status.data?.taskDrafts) return null;
  const fieldError = draft.error instanceof ApiError ? draft.error.fields.instruction : undefined;
  const dropped = draft.data?.dropped.map((field) => text.fieldNames[field]).join(', ');

  return (
    <details className={calm.card}>
      <summary>{text.summary}</summary>
      <p className={calm.help}>{text.intro}</p>
      <p className={calm.help}>{text.privacy}</p>
      <div className={calm.field}>
        <label className={calm.label} htmlFor="task-instruction">{text.instruction}</label>
        <textarea id="task-instruction" className={calm.textarea} value={instruction} maxLength={INSTRUCTION_MAX}
          onChange={(event) => setInstruction(event.target.value)} aria-invalid={Boolean(fieldError)}
          aria-describedby="task-instruction-help task-instruction-error" />
        <div id="task-instruction-help" className={calm.help}>{text.instructionHelp}</div>
        <div id="task-instruction-error" className={calm.fieldError}>{fieldError && describeFieldError(fieldError, lang)}</div>
      </div>
      <button type="button" className={calm.button} disabled={draft.isPending || instruction.trim() === ''} onClick={() => draft.mutate()}>
        {draft.isPending ? text.drafting : text.makeDraft}
      </button>
      {draft.isError && !fieldError && (
        <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(draft.error, lang)}</div>
      )}
      {draft.isSuccess && (
        <div className={`${calm.alert} ${calm.alertOk}`} role="status">
          <strong>{text.filled}</strong>
          {draft.data.removed > 0 && <p>{text.removed(draft.data.removed)} {text.placeholderNote}</p>}
          {dropped && <p>{text.dropped(dropped)}</p>}
        </div>
      )}
    </details>
  );
}
