import { z } from 'zod';
import { API_TOKEN_NAME_MAX } from '../constants/mcp.constants';

/** POST /api/me/api-tokens. */
export const newApiTokenSchema = z.strictObject({
  name: z.string({ error: 'required' }).trim().min(1, { error: 'required' }).max(API_TOKEN_NAME_MAX, { error: 'too_long' }),
  password: z.string({ error: 'required' }).min(1, { error: 'required' }).max(1024, { error: 'too_long' }),
});

export const apiTokenIdSchema = z.uuid({ error: 'not_found' });
