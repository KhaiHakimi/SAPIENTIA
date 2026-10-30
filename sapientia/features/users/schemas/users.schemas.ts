import { z } from 'zod';
import { emailSchema } from '@/features/auth/schemas/auth.schemas';

export const staffRoleSchema = z.enum(['admin', 'sender', 'teacher'], { error: 'invalid_role' });

export const inviteUserSchema = z.strictObject({
  email: emailSchema,
  name: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(120, { error: 'too_long' }),
  role: staffRoleSchema,
});
