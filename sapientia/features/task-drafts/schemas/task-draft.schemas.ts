import { z } from 'zod';
import { INSTRUCTION_MAX } from '../constants/task-draft.constants';

/** POST /api/ai/task-draft. */
export const taskDraftRequestSchema = z.strictObject({
  instruction: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(INSTRUCTION_MAX, { error: 'too_long' }),
});
