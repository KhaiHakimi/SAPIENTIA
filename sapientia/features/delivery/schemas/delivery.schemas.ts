import { z } from 'zod';
import { STATE_CODES } from '../constants/delivery.constants';

const timeSchema = z.string({ error: 'required' }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'invalid_time' });

/** PATCH /api/school/settings: any subset; the merged result is checked again in the service. */
export const settingsPatchSchema = z.strictObject({
  workStart: timeSchema.optional(),
  workEnd: timeSchema.optional(),
  weekendDays: z.array(z.number().int().min(1, { error: 'invalid_day' }).max(7, { error: 'invalid_day' }), { error: 'invalid_day' })
    .max(3, { error: 'too_many_days' })
    .refine((days) => new Set(days).size === days.length, { error: 'duplicate_day' })
    .transform((days) => [...days].sort((a, b) => a - b) as (1 | 2 | 3 | 4 | 5 | 6 | 7)[])
    .optional(),
  stateCode: z.enum(STATE_CODES, { error: 'invalid_state' }).nullable().optional(),
});

export const calendarEventSchema = z.strictObject({
  onDate: z.iso.date({ error: 'invalid_date' }),
  kind: z.enum(['holiday', 'working_day'], { error: 'invalid_kind' }),
  title: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(120, { error: 'too_long' }),
});

export const calendarQuerySchema = z.object({
  from: z.iso.date({ error: 'invalid_date' }).optional(),
  to: z.iso.date({ error: 'invalid_date' }).optional(),
});

export const eventIdSchema = z.uuid();
