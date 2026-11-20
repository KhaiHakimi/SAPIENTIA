import { z } from 'zod';
import { ERPH_URL_MAX, LESSON_NOTE_MAX, NOT_HELD_REASONS } from '../constants/lessons.constants';
import type { NotHeldReason } from '../interfaces/lesson.interface';

/** GET /api/lessons?onDate=. */
export const lessonDayQuerySchema = z.object({
  onDate: z.iso.date({ error: 'invalid_date' }),
});

/**
 * PUT /api/lessons/records. A reason is needed exactly when the lesson was not held; on a held lesson any reason sent is
 * dropped. The e-RPH link must be https, so no other scheme (javascript:, data:) can be stored and shown as a link.
 */
export const lessonRecordSchema = z.strictObject({
  slotId: z.uuid({ error: 'invalid_slot' }),
  onDate: z.iso.date({ error: 'invalid_date' }),
  status: z.enum(['held', 'not_held'], { error: 'invalid_status' }),
  reason: z.enum(NOT_HELD_REASONS as [NotHeldReason, ...NotHeldReason[]], { error: 'invalid_reason' }).optional(),
  note: z.string().trim().max(LESSON_NOTE_MAX, { error: 'too_long' }).optional().transform((value) => value || undefined),
  erphUrl: z.string().trim().max(ERPH_URL_MAX, { error: 'too_long' })
    .pipe(z.union([z.literal(''), z.url({ protocol: /^https$/, error: 'invalid_url' })]))
    .optional().transform((value) => value || undefined),
}).refine((record) => record.status === 'held' || record.reason !== undefined, { error: 'reason_required', path: ['reason'] })
  .transform((record) => (record.status === 'held' ? { ...record, reason: undefined } : record));

/** POST /api/lessons/records/photo (form fields) and DELETE /api/lessons/records/photo?slotId=&onDate=. */
export const lessonTargetSchema = z.object({
  slotId: z.uuid({ error: 'invalid_slot' }),
  onDate: z.iso.date({ error: 'invalid_date' }),
});
