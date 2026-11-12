'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FeasibilityNotice } from '@/features/capacity/components/FeasibilityNotice';
import { ESTIMATE_MAX_MINUTES, ESTIMATE_MIN_MINUTES } from '@/features/capacity/constants/capacity.constants';
import type { FeasibilityRequest } from '@/features/capacity/interfaces/capacity.interface';
import { fetchWorkload, WORKLOAD_KEY } from '@/features/capacity/services/capacity.client';
import { formatDuration } from '@/features/capacity/services/duration-text';
import { URGENT_REASON_MAX } from '@/features/delivery/constants/delivery.constants';
import { fetchDeliveryPreview, PREVIEW_KEY } from '@/features/delivery/services/delivery.client';
import { describeDeliveryTime } from '@/features/delivery/services/delivery-text';
import { fetchSchoolData, schoolDataKey } from '@/features/school-data/services/school-data.client';
import { fetchStaffDirectory, STAFF_DIRECTORY_KEY } from '@/features/users/services/users.client';
import { ApiError } from '@/shared/api/api-client';
import { describeApiError, describeFieldError } from '@/shared/api/api-error.messages';
import calm from '@/shared/calm/Calm.module.css';
import { formatDay } from '@/shared/i18n/format-date';
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
 * With a time estimate it also warns when an assignee does not have the time by the due date, and each name carries the
 * work that person already has this week, so the sender can spread tasks before choosing (plan Phase 2).
 */
export function CreateTaskPage() {
  const text = useMessages(TASKS_MESSAGES);
  const { lang } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: STAFF_DIRECTORY_KEY, queryFn: fetchStaffDirectory });
  // Extra information only: if it cannot be fetched, the names are listed without it and the form still works.
  const workload = useQuery({ queryKey: WORKLOAD_KEY, queryFn: fetchWorkload });
  const committedMinutes = new Map(workload.data?.items.map((item) => [item.userId, item.committedMinutes]));
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [urgentReason, setUrgentReason] = useState('');
  const [taskTypeId, setTaskTypeId] = useState('');
  const [minutes, setMinutes] = useState('');
  const taskTypes = useQuery({ queryKey: schoolDataKey('task-types'), queryFn: () => fetchSchoolData('task-types') });
  const preview = useQuery({ queryKey: PREVIEW_KEY, queryFn: fetchDeliveryPreview, refetchInterval: PREVIEW_REFRESH_MS });
  const held = preview.data?.held ?? false;

  const create = useMutation({
    mutationFn: () => createTask({
      title, dueOn, assigneeIds, description: description || undefined,
      taskTypeId: taskTypeId || undefined, estimatedMinutes: minutes === '' ? undefined : Number(minutes),
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

  // Choosing a type fills in its usual estimate, which the sender can still change for this task.
  const chooseTaskType = (id: string) => {
    setTaskTypeId(id);
    const estimate = taskTypes.data?.find((type) => type.id === id)?.estimatedMinutes;
    if (estimate) setMinutes(String(estimate));
  };
  const estimate = Number(minutes);
  const canCheck = assigneeIds.length > 0 && dueOn !== '' && minutes !== ''
    && Number.isInteger(estimate) && estimate >= ESTIMATE_MIN_MINUTES && estimate <= ESTIMATE_MAX_MINUTES;
  const feasibilityRequest: FeasibilityRequest | null = canCheck
    ? { assigneeIds, dueOn, estimatedMinutes: estimate, urgent: held && urgent }
    : null;

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
          <div id="task-assignees-help" className={calm.help}>
            {text.assigneesHelp}{workload.data && <> {text.workloadHelp(formatDay(workload.data.weekEndsOn, lang, { weekday: true }))}</>}
          </div>
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
                  <span>
                    {person.name}
                    {committedMinutes.has(person.id) && (
                      <span className={calm.muted}> · {text.workload(formatDuration(committedMinutes.get(person.id) ?? 0, lang))}</span>
                    )}
                  </span>
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
          <label className={calm.label} htmlFor="task-type">{text.taskType} <span className={calm.muted}>({text.optional})</span></label>
          <select id="task-type" className={calm.select} value={taskTypeId} onChange={(event) => chooseTaskType(event.target.value)}
            aria-invalid={Boolean(fields.taskTypeId)} aria-describedby="task-type-error">
            <option value="">{text.noTaskType}</option>
            {(taskTypes.data ?? []).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
          <div id="task-type-error" className={calm.fieldError}>{fieldText(fields.taskTypeId, text, lang)}</div>
        </div>

        <div className={calm.field}>
          <label className={calm.label} htmlFor="task-minutes">{text.estimate} <span className={calm.muted}>({text.optional})</span></label>
          <input id="task-minutes" type="number" inputMode="numeric" className={calm.input} value={minutes}
            min={ESTIMATE_MIN_MINUTES} max={ESTIMATE_MAX_MINUTES} step={5} onChange={(event) => setMinutes(event.target.value)}
            aria-invalid={Boolean(fields.estimatedMinutes)} aria-describedby="task-minutes-help task-minutes-error" />
          <div id="task-minutes-help" className={calm.help}>{text.estimateHelp}</div>
          <div id="task-minutes-error" className={calm.fieldError}>{fieldText(fields.estimatedMinutes, text, lang)}</div>
        </div>

        <FeasibilityNotice request={feasibilityRequest} onUseDate={setDueOn} />

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
