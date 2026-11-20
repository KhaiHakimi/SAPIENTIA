import { z } from 'zod';
import {
  HOMEWORK_COMMENT_MAX, HOMEWORK_DETAILS_MAX, HOMEWORK_TITLE_MAX, MARKING_MAX_MINUTES, MARKING_MIN_MINUTES,
} from '../constants/homework.constants';

const lessonFields = {
  classId: z.uuid({ error: 'invalid_class' }),
  subjectId: z.uuid({ error: 'invalid_subject' }),
  dueOn: z.iso.date({ error: 'invalid_date' }),
  markingMinutes: z.number({ error: 'invalid_number' }).int({ error: 'invalid_number' })
    .min(MARKING_MIN_MINUTES, { error: 'too_small' }).max(MARKING_MAX_MINUTES, { error: 'too_large' }).optional(),
  markBy: z.iso.date({ error: 'invalid_date' }).optional(),
};

/**
 * The marking estimate and the day it is planned for come as a pair: each is reported when the other is missing, and the
 * marking cannot be finished before the homework is handed in.
 */
function checkMarkingPair(input: { dueOn: string; markingMinutes?: number; markBy?: string }, ctx: z.RefinementCtx): void {
  if (input.markBy !== undefined && input.markingMinutes === undefined) {
    ctx.addIssue({ code: 'custom', message: 'required', path: ['markingMinutes'] });
  }
  if (input.markingMinutes !== undefined && input.markBy === undefined) {
    ctx.addIssue({ code: 'custom', message: 'required', path: ['markBy'] });
  }
  if (input.markBy !== undefined && input.markBy < input.dueOn) {
    ctx.addIssue({ code: 'custom', message: 'before_due', path: ['markBy'] });
  }
}

/** POST /api/homework/preview. */
export const homeworkPreviewSchema = z.strictObject(lessonFields).superRefine(checkMarkingPair);

/** POST /api/homework. Empty details are dropped. */
export const setHomeworkSchema = z.strictObject({
  ...lessonFields,
  title: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(HOMEWORK_TITLE_MAX, { error: 'too_long' }),
  details: z.string().trim().max(HOMEWORK_DETAILS_MAX, { error: 'too_long' }).optional().transform((value) => value || undefined),
}).superRefine(checkMarkingPair);

/** PATCH /api/homework/:id. */
export const updateHomeworkSchema = z.strictObject({
  marked: z.boolean({ error: 'invalid_boolean' }),
});

/** PUT /api/homework/:id/hand-ins/:studentId. */
export const handInSchema = z.strictObject({
  handedIn: z.boolean({ error: 'invalid_boolean' }),
});

/** Path ids: a malformed one is a record that does not exist. */
export const homeworkIdSchema = z.uuid({ error: 'not_found' });
export const commentIdSchema = z.uuid({ error: 'not_found' });

/** Twelve digits written like a MyKad number, anywhere in a comment: never kept, so refused if typed by habit. */
const MYKAD_IN_TEXT = /\b\d{6}-?\d{2}-?\d{4}\b/;

/** POST /api/homework/:id/comments: one short note to one pupil of the class. */
export const addCommentSchema = z.strictObject({
  studentId: z.uuid({ error: 'invalid_student' }),
  body: z.string({ error: 'required' }).trim()
    .min(1, { error: 'required' })
    .max(HOMEWORK_COMMENT_MAX, { error: 'too_long' })
    .refine((value) => !MYKAD_IN_TEXT.test(value), { error: 'looks_like_mykad' }),
});

/** PATCH /api/homework/:id/comments/:commentId: a comment can be hidden, never edited or deleted. */
export const hideCommentSchema = z.strictObject({
  hidden: z.literal(true, { error: 'invalid_boolean' }),
});

