import { z } from 'zod';
import { URGENT_REASON_MAX } from '@/features/delivery/constants/delivery.constants';
import { ASSIGNEES_MAX, ASSIGNMENT_STATUSES, COMMENT_MAX, TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from '../constants/task.constants';

const statusSchema = z.enum(ASSIGNMENT_STATUSES, { error: 'invalid_status' });

export const createTaskSchema = z.strictObject({
  title: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(TASK_TITLE_MAX, { error: 'too_long' }),
  description: z.string().trim().max(TASK_DESCRIPTION_MAX, { error: 'too_long' }).optional()
    .transform((value) => value || undefined),
  dueOn: z.iso.date({ error: 'invalid_date' }),
  assigneeIds: z.array(z.uuid({ error: 'invalid_assignee' }), { error: 'required' })
    .min(1, { error: 'required' }).max(ASSIGNEES_MAX, { error: 'too_many' })
    .transform((ids) => [...new Set(ids)]),
  urgent: z.boolean({ error: 'invalid_boolean' }).optional().default(false),
  urgentReason: z.string().trim().max(URGENT_REASON_MAX, { error: 'too_long' }).optional(),
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

export const addCommentSchema = z.strictObject({
  body: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(COMMENT_MAX, { error: 'too_long' }),
});

/** Letters, digits and - _ : . only, so the key is safe to store and compare; a UUID fits. */
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_\-:.]{8,100}$/, { error: 'invalid_idempotency_key' });

export const taskIdSchema = z.uuid({ error: 'not_found' });
