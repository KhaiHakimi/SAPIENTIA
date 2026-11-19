import { z } from 'zod';
import { ASSIGNEES_MAX } from '@/features/tasks/constants/task.constants';
import { taskTitleSchema } from '@/features/tasks/schemas/tasks.schemas';

/** POST /api/tasks/similar. */
export const similarTasksRequestSchema = z.strictObject({
  title: taskTitleSchema,
  assigneeIds: z.array(z.uuid({ error: 'invalid_assignee' })).max(ASSIGNEES_MAX, { error: 'too_many' }).optional().default([]),
});
