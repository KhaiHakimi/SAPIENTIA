import { z } from 'zod';
import { PUSH_ENDPOINT_MAX } from '../constants/notification.constants';
import { isAllowedPushEndpoint } from '../services/push-endpoint';

/** Base64url as browsers encode the subscription keys. */
const base64Url = (max: number) => z.string({ error: 'required' }).min(1, { error: 'required' }).max(max, { error: 'too_long' })
  .regex(/^[A-Za-z0-9_-]+={0,2}$/, { error: 'invalid_key' });

const endpointSchema = z.string({ error: 'required' }).max(PUSH_ENDPOINT_MAX, { error: 'too_long' })
  .refine(isAllowedPushEndpoint, { error: 'push_service_not_allowed' });

export const notificationSettingsPatchSchema = z.strictObject({
  email: z.boolean({ error: 'required' }),
});

/** PushSubscription.toJSON() also carries expirationTime; it is accepted and ignored. */
export const pushSubscriptionSchema = z.strictObject({
  endpoint: endpointSchema,
  expirationTime: z.number().nullable().optional(),
  keys: z.strictObject({ p256dh: base64Url(200), auth: base64Url(100) }),
});

export const pushUnsubscribeSchema = z.strictObject({
  endpoint: z.string({ error: 'required' }).min(1, { error: 'required' }).max(PUSH_ENDPOINT_MAX, { error: 'too_long' }),
});
