import { z } from 'zod';
import {
  SCHOOL_NUMBER_MAX,
  STUDENT_NAME_MAX,
  STUDENT_PASSWORD_MAX_LENGTH,
  STUDENT_PASSWORD_MIN_LENGTH,
  STUDENTS_PER_BATCH,
} from '../constants/students.constants';

/** Error messages are codes; the web app translates them. Unknown fields are refused (strictObject). */

/** A MyKad number is 12 digits (YYMMDD-PB-###G), with or without dashes. Never stored, so refused if typed by habit. */
const MYKAD = /^\d{6}-?\d{2}-?\d{4}$/;

export const studentIdSchema = z.uuid({ error: 'not_found' });

const studentNameSchema = z.string({ error: 'required' }).trim()
  .min(1, { error: 'required' })
  .max(STUDENT_NAME_MAX, { error: 'too_long' });

/** Optional; an empty value means none. Letters, digits, '/' and '-' only. */
const schoolNumberSchema = z.string({ error: 'invalid_school_number' }).trim()
  .max(SCHOOL_NUMBER_MAX, { error: 'too_long' })
  .refine((value) => !MYKAD.test(value), { error: 'looks_like_mykad' })
  .refine((value) => value === '' || /^[A-Za-z0-9/-]+$/.test(value), { error: 'invalid_school_number' })
  .transform((value) => value || null)
  .nullable();

const classIdSchema = z.uuid({ error: 'invalid_class' });

export const addStudentsSchema = z.strictObject({
  classId: classIdSchema,
  students: z.array(
    z.strictObject({ name: studentNameSchema, schoolNumber: schoolNumberSchema.optional() }),
    { error: 'required' },
  ).min(1, { error: 'required' }).max(STUDENTS_PER_BATCH, { error: 'too_many' }),
});

export const updateStudentSchema = z.strictObject({
  name: studentNameSchema.optional(),
  schoolNumber: schoolNumberSchema.optional(),
  classId: classIdSchema.optional(),
  status: z.enum(['active', 'disabled'], { error: 'invalid_status' }).optional(),
});

export const studentListQuerySchema = z.object({
  classId: classIdSchema.optional(),
});

export const studentSignInSchema = z.strictObject({
  username: z.string({ error: 'required' }).trim().toLowerCase().min(1, { error: 'required' }).max(64, { error: 'too_long' }),
  // No rule beyond a sanity cap: sign-in must not tell anyone what the password policy is.
  password: z.string({ error: 'required' }).min(1, { error: 'required' }).max(1024, { error: 'too_long' }),
});

export const changeStudentPasswordSchema = z.strictObject({
  currentPassword: z.string({ error: 'required' }).min(1, { error: 'required' }).max(1024, { error: 'too_long' }),
  newPassword: z.string({ error: 'required' })
    .min(STUDENT_PASSWORD_MIN_LENGTH, { error: 'too_short' })
    .max(STUDENT_PASSWORD_MAX_LENGTH, { error: 'too_long' }),
});
