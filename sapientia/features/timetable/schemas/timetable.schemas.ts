import { z } from 'zod';
import type { IsoWeekday } from '@/features/delivery/interfaces/working-calendar.interface';
import { SLOT_LABEL_MAX } from '../constants/timetable.constants';

const timeSchema = z.string({ error: 'required' }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'invalid_time' });

/** GET /api/timetable?teacherId=: without it, the caller's own week. */
export const timetableQuerySchema = z.object({ teacherId: z.uuid({ error: 'invalid_teacher' }).optional() });

/** POST /api/timetable/slots: a lesson needs both class and subject; anything else needs a label. */
export const newSlotSchema = z.strictObject({
  teacherId: z.uuid({ error: 'invalid_teacher' }),
  weekday: z.number({ error: 'invalid_day' }).int({ error: 'invalid_day' }).min(1, { error: 'invalid_day' }).max(7, { error: 'invalid_day' })
    .transform((day) => day as IsoWeekday),
  startTime: timeSchema,
  endTime: timeSchema,
  classId: z.uuid({ error: 'invalid_class' }).optional(),
  subjectId: z.uuid({ error: 'invalid_subject' }).optional(),
  label: z.string().trim().max(SLOT_LABEL_MAX, { error: 'too_long' }).optional().transform((value) => value || undefined),
})
  .refine((slot) => slot.startTime < slot.endTime, { error: 'end_before_start', path: ['endTime'] })
  .refine((slot) => Boolean(slot.classId) === Boolean(slot.subjectId), { error: 'lesson_needs_both', path: ['subjectId'] })
  .refine((slot) => Boolean(slot.classId) || Boolean(slot.label), { error: 'lesson_or_label', path: ['label'] });

export const slotIdSchema = z.uuid();
