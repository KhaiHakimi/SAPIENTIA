import { requireUser } from '@/features/auth/server/current-user.service';
import { pushSubscriptionSchema, pushUnsubscribeSchema } from '@/features/notifications/schemas/notification.schemas';
import { removePushSubscription, savePushSubscription } from '@/features/notifications/server/notification-settings.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** POST /api/me/push-subscriptions: this browser's PushSubscription.toJSON(). Only known push services are accepted. */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const { endpoint, keys } = await readJson(request, pushSubscriptionSchema);
  await savePushSubscription(actor, { endpoint, keys });
  return new Response(null, { status: 204 });
});

/** DELETE /api/me/push-subscriptions: { endpoint }. Stops push to this browser; 204 whether or not it was saved. */
export const DELETE = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const { endpoint } = await readJson(request, pushUnsubscribeSchema);
  await removePushSubscription(actor, endpoint);
  return new Response(null, { status: 204 });
});
