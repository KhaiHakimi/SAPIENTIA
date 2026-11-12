import { z } from 'zod';

const onDateSchema = z.iso.date({ error: 'invalid_date' });

/** GET /api/relief?teacherId=&onDate=. */
export const reliefDayQuerySchema = z.object({
  teacherId: z.uuid({ error: 'invalid_teacher' }),
  onDate: onDateSchema,
});

/** GET /api/relief/suggestions?slotId=&onDate=. */
export const reliefSuggestionsQuerySchema = z.object({
  slotId: z.uuid({ error: 'invalid_slot' }),
  onDate: onDateSchema,
});

/** POST /api/relief. */
export const newReliefSchema = z.strictObject({
  slotId: z.uuid({ error: 'invalid_slot' }),
  onDate: onDateSchema,
  reliefTeacherId: z.uuid({ error: 'invalid_teacher' }),
});

export const reliefIdSchema = z.uuid();
