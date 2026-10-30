import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants/password.constants';

/** Error messages are codes; the web app translates them. Unknown fields are refused (strictObject). */

export const emailSchema = z.string({ error: 'required' }).trim().toLowerCase().max(254, { error: 'too_long' })
  .pipe(z.email({ error: 'invalid_email' }));

export const signInSchema = z.strictObject({
  email: emailSchema,
  // No length rule here beyond a sanity cap: sign-in must not tell anyone what the password policy is.
  password: z.string({ error: 'required' }).min(1, { error: 'required' }).max(1024, { error: 'too_long' }),
});

export const newPasswordSchema = z.string({ error: 'required' })
  .min(PASSWORD_MIN_LENGTH, { error: 'too_short' })
  .max(PASSWORD_MAX_LENGTH, { error: 'too_long' });

export const acceptInviteSchema = z.strictObject({
  token: z.string({ error: 'required' }).min(20, { error: 'invalid_token' }).max(200, { error: 'invalid_token' }),
  password: newPasswordSchema,
});
