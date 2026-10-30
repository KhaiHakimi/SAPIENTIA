'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { URGENT_REASON_MAX } from '@/features/delivery/constants/delivery.constants';
import { fetchDeliveryPreview, PREVIEW_KEY } from '@/features/delivery/services/delivery.client';
import { describeDeliveryTime } from '@/features/delivery/services/delivery-text';
import { fetchStaffDirectory, STAFF_DIRECTORY_KEY } from '@/features/users/services/users.client';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from '../constants/task.constants';
import type { TasksMessages } from '../i18n/tasks-messages.interface';
import { TASKS_MESSAGES } from '../i18n/tasks.messages';
import { createTask, TASKS_KEY } from '../services/tasks.client';
import styles from '../styles/Tasks.module.css';

const fieldText = (reason: string | undefined, text: TasksMessages, lang: Lang) =>
  (reason && text.fieldErrors[reason]) || describeFieldError(reason, lang);

/** Asked again every minute, so a form left open across 5 pm shows the change from "now" to "tomorrow morning". */
const PREVIEW_REFRESH_MS = 60_000;

/**
 * Senders and administrators: title, assignees and due date first (plan Sprint 3); details are optional. Outside working
 * hours the form says when the task will arrive and offers the urgent override, which needs a reason (plan Sprint 4).
 */
export function CreateTaskPage() {
  const text = useMessages(TASKS_MESSAGES);
  const { lang } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: STAFF_DIRECTORY_KEY, queryFn: fetchStaffDirectory });
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [urgentReason, setUrgentReason] = useState('');
  const preview = useQuery({ queryKey: PREVIEW_KEY, queryFn: fetchDeliveryPreview, refetchInterval: PREVIEW_REFRESH_MS });
  const held = preview.data?.held ?? false;

  const create = useMutation({
    mutationFn: () => createTask({
      title, dueOn, assigneeIds, description: description || undefined,
      ...(held && urgent ? { urgent: true, urgentReason } : {}),
    }, idempotencyKey),
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      router.push(`/staff/tasks/${task.id}`);
    },
  });
  const fields = create.error instanceof ApiError ? create.error.fields : {};

  const toggle = (id: string, checked: boolean) =>
    setAssigneeIds((current) => (checked ? [...current, id] : current.filter((existing) => existing !== id)));
  const needle = filter.trim().toLowerCase();
  const visible = (staff.data ?? []).filter((person) => !needle || person.name.toLowerCase().includes(needle));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <>
      <div className={calm.pageHeader}>
        <div>
          <h1>{text.createTitle}</h1>
          <p>{text.createIntro}</p>
        </div>
      </div>
      <form className={calm.card} onSubmit={onSubmit} noValidate>
        {create.isError && (
          <div className={`${calm.alert} ${calm.alertError}`} role="alert">{describeApiError(create.error, lang)}</div>
        )}

        <div className={calm.field}>
          <label className={calm.label} htmlFor="task-title">{text.title}</label>
          <input id="task-title" className={calm.input} value={title} maxLength={TASK_TITLE_MAX} onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(fields.title)} aria-describedby="task-title-error" />
          <div id="task-title-error" className={calm.fieldError}>{fieldText(fields.title, text, lang)}</div>
        </div>

        <fieldset className={calm.fieldset} aria-describedby="task-assignees-help task-assignees-error">
          <legend>{text.assignees} <span className={calm.muted}>({text.selectedCount(assigneeIds.length)})</span></legend>
          <div id="task-assignees-help" className={calm.help}>{text.assigneesHelp}</div>
          <label className={calm.label} htmlFor="task-filter">{text.filterStaff}</label>
          <input id="task-filter" type="search" className={calm.input} value={filter} onChange={(event) => setFilter(event.target.value)} />
          <div className={styles.picker}>
            {staff.isPending ? (
              <p className={calm.muted} role="status">{text.loading}</p>
            ) : staff.isError ? (
              <p className={calm.fieldError} role="alert">{describeApiError(staff.error, lang)}</p>
            ) : visible.length === 0 ? (
              <p className={calm.muted}>{text.noStaffMatch}</p>
            ) : (
              visible.map((person) => (
                <label key={person.id} className={calm.checkbox}>
                  <input type="checkbox" checked={assigneeIds.includes(person.id)} onChange={(event) => toggle(person.id, event.target.checked)} />
                  <span>{person.name}</span>
                </label>
              ))
            )}
          </div>
          <div id="task-assignees-error" className={calm.fieldError}>{fieldText(fields.assigneeIds, text, lang)}</div>
        </fieldset>

        <div className={calm.field}>
          <label className={calm.label} htmlFor="task-due">{text.dueOn}</label>
          <input id="task-due" type="date" className={calm.input} value={dueOn} onChange={(event) => setDueOn(event.target.value)}
            aria-invalid={Boolean(fields.dueOn)} aria-describedby="task-due-error" />
          <div id="task-due-error" className={calm.fieldError}>{fieldText(fields.dueOn, text, lang)}</div>
        </div>

        <div className={calm.field}>
          <label className={calm.label} htmlFor="task-description">{text.description} <span className={calm.muted}>({text.optional})</span></label>
          <textarea id="task-description" className={calm.textarea} value={description} maxLength={TASK_DESCRIPTION_MAX}
            onChange={(event) => setDescription(event.target.value)} aria-describedby="task-description-help task-description-error" />
          <div id="task-description-help" className={calm.help}>{text.descriptionHelp}</div>
          <div id="task-description-error" className={calm.fieldError}>{fieldText(fields.description, text, lang)}</div>
        </div>

        {preview.data && (
          <div className={`${calm.alert} ${held ? calm.alertInfo : ''}`} role="status">
            <strong>
              {held ? text.willDeliver(describeDeliveryTime(preview.data.deliverAt, preview.data.timeZone, lang)) : text.deliversNow}
            </strong>
            {held && <p className={calm.help}>{text.heldExplained}</p>}
          </div>
        )}

        {held && (
          <div className={calm.field}>
            <label className={calm.checkbox}>
              <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} aria-describedby="task-urgent-help" />
              <span>{text.urgentLabel}</span>
            </label>
            <div id="task-urgent-help" className={calm.help}>{text.urgentHelp}</div>
            {urgent && (
              <>
                <label className={calm.label} htmlFor="task-urgent-reason">{text.urgentReason}</label>
                <textarea id="task-urgent-reason" className={calm.textarea} value={urgentReason} maxLength={URGENT_REASON_MAX}
                  onChange={(event) => setUrgentReason(event.target.value)} aria-invalid={Boolean(fields.urgentReason)}
                  aria-describedby="task-urgent-error" />
                <div id="task-urgent-error" className={calm.fieldError}>{fieldText(fields.urgentReason, text, lang)}</div>
              </>
            )}
          </div>
        )}

        <button type="submit" className={`${calm.button} ${calm.primary}`} disabled={create.isPending}>
          {create.isPending ? text.sending : text.send}
        </button>
      </form>
    </>
  );
}
