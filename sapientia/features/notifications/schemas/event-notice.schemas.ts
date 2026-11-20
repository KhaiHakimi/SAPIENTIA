import { z } from 'zod';

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/**
 * A notify-event job as the worker reads it back from the queue. Only this app writes these jobs, but the queue is a
 * database table, so the worker checks the shape before acting on it.
 */
export const eventNoticeJobSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('extension.requested'), schoolId: z.uuid(), extensionId: z.uuid() }),
  z.strictObject({ kind: z.literal('extension.answered'), schoolId: z.uuid(), extensionId: z.uuid() }),
  z.strictObject({ kind: z.literal('relief.assigned'), schoolId: z.uuid(), reliefId: z.uuid() }),
  z.strictObject({ kind: z.literal('meeting.requested'), schoolId: z.uuid(), meetingId: z.uuid() }),
  z.strictObject({
    kind: z.literal('relief.cancelled'),
    schoolId: z.uuid(),
    reliefId: z.uuid(),
    reliefTeacherId: z.uuid(),
    absentTeacherId: z.uuid(),
    onDate: z.iso.date(),
    startTime: clockTime,
    endTime: clockTime,
  }),
]);
