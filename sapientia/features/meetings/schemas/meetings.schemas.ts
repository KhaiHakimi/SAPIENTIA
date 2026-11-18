import { z } from 'zod';
import { MEETING_DECLINE_REASONS, MEETING_TIMES_OF_DAY, MEETING_TOPICS } from '../constants/meetings.constants';

/** Error messages are codes; the web app translates them. Unknown fields are refused (strictObject). */

export const meetingIdSchema = z.uuid({ error: 'not_found' });

export const requestMeetingSchema = z.strictObject({
  teacherId: z.uuid({ error: 'invalid_teacher' }),
  topic: z.enum(MEETING_TOPICS, { error: 'invalid_topic' }),
  timeOfDay: z.enum(MEETING_TIMES_OF_DAY, { error: 'invalid_time_of_day' }),
});

export const answerMeetingSchema = z.discriminatedUnion('answer', [
  z.strictObject({
    answer: z.literal('accept'),
    date: z.iso.date({ error: 'invalid_date' }),
    time: z.string({ error: 'invalid_time' }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'invalid_time' }),
  }),
  z.strictObject({
    answer: z.literal('decline'),
    reason: z.enum(MEETING_DECLINE_REASONS, { error: 'invalid_reason' }),
  }),
], { error: 'invalid_answer' });
