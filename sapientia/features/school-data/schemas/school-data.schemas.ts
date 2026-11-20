import { z } from 'zod';
import { ESTIMATE_MAX_MINUTES, ESTIMATE_MIN_MINUTES } from '@/features/capacity/constants/capacity.constants';
import { SCHOOL_DATA_KINDS, SCHOOL_DATA_NAME_MAX } from '../constants/school-data.constants';

export const schoolDataKindSchema = z.enum(SCHOOL_DATA_KINDS);

export const schoolDataIdSchema = z.uuid();

const nameSchema = z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(SCHOOL_DATA_NAME_MAX, { error: 'too_long' });

export const estimatedMinutesSchema = z.number({ error: 'invalid_number' }).int({ error: 'invalid_number' })
  .min(ESTIMATE_MIN_MINUTES, { error: 'too_small' }).max(ESTIMATE_MAX_MINUTES, { error: 'too_large' });

/** POST /api/school-data/subjects and /classes. */
export const namedItemSchema = z.strictObject({ name: nameSchema });

/** POST /api/school-data/task-types: the name and how long the task usually takes one person. */
export const taskTypeSchema = z.strictObject({ name: nameSchema, estimatedMinutes: estimatedMinutesSchema });
