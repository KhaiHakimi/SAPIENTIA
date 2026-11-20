import { z } from 'zod';
import { EXTENSION_REASON_MAX } from '../constants/extension.constants';

/** POST /api/tasks/:id/extension-requests: the date asked for; the reason is optional, because the figures already say why. */
export const newExtensionSchema = z.strictObject({
  requestedDueOn: z.iso.date({ error: 'invalid_date' }),
  reason: z.string().trim().max(EXTENSION_REASON_MAX, { error: 'too_long' }).optional().transform((value) => value || undefined),
});

/** PATCH /api/tasks/:id/extension-requests/:requestId: accept the date asked for, or give a different one. */
export const extensionDecisionSchema = z.discriminatedUnion('decision', [
  z.strictObject({ decision: z.literal('approve') }),
  z.strictObject({ decision: z.literal('propose'), dueOn: z.iso.date({ error: 'invalid_date' }) }),
], { error: 'invalid_decision' });

export const extensionIdSchema = z.uuid();
