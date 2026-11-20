import { requireUser } from '@/features/auth/server/current-user.service';
import { notificationSettingsPatchSchema } from '@/features/notifications/schemas/notification.schemas';
import { getNotificationSettings, updateNotificationSettings } from '@/features/notifications/server/notification-settings.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/me/notifications: my email and weekly digest choices, and whether push is offered (with the public VAPID key). */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  return Response.json(await getNotificationSettings(actor));
});

/** PATCH /api/me/notifications: { email?, weeklyDigest? }, at least one. Changes the caller's own choices only. */
export const PATCH = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const patch = await readJson(request, notificationSettingsPatchSchema);
  return Response.json(await updateNotificationSettings(actor, patch));
});
