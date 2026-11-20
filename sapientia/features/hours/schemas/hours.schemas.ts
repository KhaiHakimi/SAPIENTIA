import { z } from 'zod';
import { HOURS_KINDS, HOURS_MINUTES_MAX, HOURS_NOTE_MAX } from '../constants/hours.constants';
import type { HoursKind } from '../interfaces/hours.interface';

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'invalid_month' });

/** GET /api/me/hours?month= and DELETE /api/me/hours/share?month=. */
export const hoursMonthQuerySchema = z.object({ month: monthSchema });

/** PUT /api/me/hours/share: share the month's total as it is now. */
export const hoursShareSchema = z.strictObject({ month: monthSchema });

/** POST /api/me/hours. Whole minutes, at least one, at most a day. */
export const newHoursEntrySchema = z.strictObject({
  onDate: z.iso.date({ error: 'invalid_date' }),
  minutes: z.number({ error: 'invalid_minutes' }).int({ error: 'invalid_minutes' }).min(1, { error: 'invalid_minutes' })
    .max(HOURS_MINUTES_MAX, { error: 'invalid_minutes' }),
  kind: z.enum(HOURS_KINDS as [HoursKind, ...HoursKind[]], { error: 'invalid_kind' }),
  note: z.string().trim().max(HOURS_NOTE_MAX, { error: 'too_long' }).optional().transform((value) => value || undefined),
});

export const hoursEntryIdSchema = z.uuid();
