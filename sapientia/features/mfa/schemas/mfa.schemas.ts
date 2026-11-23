import { z } from 'zod';

/** Error messages are codes; the web app translates them. Unknown fields are refused (strictObject). */

const passwordSchema = z.string({ error: 'required' }).min(1, { error: 'required' }).max(1024, { error: 'too_long' });
/** Six digits; spaces a person may type between the groups are dropped. */
const codeSchema = z.string({ error: 'required' }).transform((value) => value.replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d{6}$/, { error: 'wrong_code' }));

export const passwordRequestSchema = z.strictObject({ password: passwordSchema });

export const mfaCodeRequestSchema = z.strictObject({ code: codeSchema });

export const mfaSignInSchema = z.union([
  z.strictObject({ code: codeSchema }),
  z.strictObject({
    recoveryCode: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(32, { error: 'wrong_code' }),
  }),
], { error: 'wrong_code' });

export const mfaRequirementSchema = z.strictObject({
  requiredForAdmins: z.boolean({ error: 'invalid_boolean' }),
  password: passwordSchema,
});
