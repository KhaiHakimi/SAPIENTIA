import { z } from 'zod';
import { URGENT_REASON_MAX } from '@/features/delivery/constants/delivery.constants';
import { estimatedMinutesSchema } from '@/features/school-data/schemas/school-data.schemas';
import {
  ASSIGNEES_MAX, ASSIGNMENT_STATUSES, COMMENT_MAX, TASK_DESCRIPTION_MAX, TASK_TITLE_MAX, TIME_TAKEN_OPTIONS,
} from '../constants/task.constants';

const statusSchema = z.enum(ASSIGNMENT_STATUSES, { error: 'invalid_status' });

/** The task's own fields, shared with anything else that proposes a task (Phase 6 drafts), so both obey the same rules. */
export const taskTitleSchema = z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(TASK_TITLE_MAX, { error: 'too_long' });
export const taskDescriptionSchema = z.string().trim().max(TASK_DESCRIPTION_MAX, { error: 'too_long' }).optional()
  .transform((value) => value || undefined);
export const taskDueOnSchema = z.iso.date({ error: 'invalid_date' });

export const createTaskSchema = z.strictObject({
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  dueOn: taskDueOnSchema,
  assigneeIds: z.array(z.uuid({ error: 'invalid_assignee' }), { error: 'required' })
    .min(1, { error: 'required' }).max(ASSIGNEES_MAX, { error: 'too_many' })
    .transform((ids) => [...new Set(ids)]),
  urgent: z.boolean({ error: 'invalid_boolean' }).optional().default(false),
  urgentReason: z.string().trim().max(URGENT_REASON_MAX, { error: 'too_long' }).optional(),
  // Capacity (Phase 2): how long the task takes one person. A task type supplies its usual estimate; minutes override it.
  taskTypeId: z.uuid({ error: 'invalid_task_type' }).optional(),
  estimatedMinutes: estimatedMinutesSchema.optional(),
}).transform(({ urgentReason, ...task }) => ({
  ...task,
  // A reason only means something with the override; without it, it is dropped rather than stored.
  urgentReason: task.urgent ? urgentReason || undefined : undefined,
})).refine((task) => !task.urgent || task.urgentReason, { error: 'required', path: ['urgentReason'] });

export const tasksQuerySchema = z.object({
  view: z.enum(['assigned', 'sent', 'held'], { error: 'invalid_view' }),
  status: statusSchema.optional(),
});

export const updateMyAssignmentSchema = z.strictObject({ status: statusSchema });

/** PUT /api/tasks/:id/assignments/me/time-taken: one of the three bands, or null to take the answer back. */
export const timeTakenSchema = z.strictObject({ timeTaken: z.enum(TIME_TAKEN_OPTIONS, { error: 'invalid_time_taken' }).nullable() });

export const addCommentSchema = z.strictObject({
  body: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(COMMENT_MAX, { error: 'too_long' }),
});

/** Letters, digits and - _ : . only, so the key is safe to store and compare; a UUID fits. */
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_\-:.]{8,100}$/, { error: 'invalid_idempotency_key' });

export const taskIdSchema = z.uuid({ error: 'not_found' });
