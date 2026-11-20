import { z } from 'zod';
import { estimatedMinutesSchema } from '@/features/school-data/schemas/school-data.schemas';
import { ASSIGNEES_MAX } from '@/features/tasks/constants/task.constants';

/** POST /api/tasks/feasibility: the same people, date and estimate the task would be created with. */
export const feasibilityRequestSchema = z.strictObject({
  assigneeIds: z.array(z.uuid({ error: 'invalid_assignee' }), { error: 'required' })
    .min(1, { error: 'required' }).max(ASSIGNEES_MAX, { error: 'too_many' })
    .transform((ids) => [...new Set(ids)]),
  dueOn: z.iso.date({ error: 'invalid_date' }),
  estimatedMinutes: estimatedMinutesSchema,
  urgent: z.boolean({ error: 'invalid_boolean' }).optional().default(false),
});
