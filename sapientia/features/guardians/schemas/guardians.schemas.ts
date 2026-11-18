import { z } from 'zod';
import {
  GUARDIAN_NAME_MAX,
  GUARDIAN_PASSWORD_MAX_LENGTH,
  GUARDIAN_PASSWORD_MIN_LENGTH,
  GUARDIAN_RELATIONSHIPS,
  LINK_REFUSAL_REASONS,
  LINK_REMOVAL_REASONS,
} from '../constants/guardians.constants';

/** Error messages are codes; the web app translates them. Unknown fields are refused (strictObject). */

export const guardianIdSchema = z.uuid({ error: 'not_found' });
export const linkIdSchema = z.uuid({ error: 'not_found' });

const guardianNameSchema = z.string({ error: 'required' }).trim()
  .min(1, { error: 'required' })
  .max(GUARDIAN_NAME_MAX, { error: 'too_long' });

const studentIdSchema = z.uuid({ error: 'invalid_student' });
const relationshipSchema = z.enum(GUARDIAN_RELATIONSHIPS, { error: 'invalid_relationship' });

export const addGuardianSchema = z.strictObject({
  name: guardianNameSchema,
  studentId: studentIdSchema,
  relationship: relationshipSchema,
});

export const updateGuardianSchema = z.strictObject({
  name: guardianNameSchema.optional(),
  status: z.enum(['active', 'disabled'], { error: 'invalid_status' }).optional(),
});

export const addLinkSchema = z.strictObject({
  studentId: studentIdSchema,
  relationship: relationshipSchema,
});

export const removeLinkSchema = z.strictObject({
  reason: z.enum(LINK_REMOVAL_REASONS, { error: 'invalid_reason' }),
});

export const refuseLinkSchema = z.strictObject({
  reason: z.enum(LINK_REFUSAL_REASONS, { error: 'invalid_reason' }),
});

export const guardianSignInSchema = z.strictObject({
  username: z.string({ error: 'required' }).trim().toLowerCase().min(1, { error: 'required' }).max(64, { error: 'too_long' }),
  // No rule beyond a sanity cap: sign-in must not tell anyone what the password policy is.
  password: z.string({ error: 'required' }).min(1, { error: 'required' }).max(1024, { error: 'too_long' }),
});

export const changeGuardianPasswordSchema = z.strictObject({
  currentPassword: z.string({ error: 'required' }).min(1, { error: 'required' }).max(1024, { error: 'too_long' }),
  newPassword: z.string({ error: 'required' })
    .min(GUARDIAN_PASSWORD_MIN_LENGTH, { error: 'too_short' })
    .max(GUARDIAN_PASSWORD_MAX_LENGTH, { error: 'too_long' }),
});
