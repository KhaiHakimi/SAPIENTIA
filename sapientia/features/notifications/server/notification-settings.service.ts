import 'server-only';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { getPool } from '@/shared/server/database.service';
import type { NotificationSettings, NotificationSettingsPatch, PushSubscriptionInput } from '../interfaces/notification.interface';
import { readPushConfig } from './notification-config.service';
import {
  deleteOwnSubscription, readEmailPreference, upsertSubscription, writeEmailPreference,
} from './notifications.repository';

/** Each person manages only their own notifications; there is no way to change someone else's. */

export async function getNotificationSettings(actor: SessionUser): Promise<NotificationSettings> {
  const push = readPushConfig();
  return {
    email: await readEmailPreference(getPool(), actor.schoolId, actor.id),
    push: { available: push !== null, publicKey: push?.publicKey ?? null },
  };
}

export async function updateNotificationSettings(actor: SessionUser, patch: NotificationSettingsPatch): Promise<NotificationSettings> {
  await writeEmailPreference(getPool(), actor.schoolId, actor.id, patch.email);
  return getNotificationSettings(actor);
}

export async function savePushSubscription(actor: SessionUser, input: PushSubscriptionInput): Promise<void> {
  await upsertSubscription(getPool(), actor.schoolId, actor.id, input);
}

export async function removePushSubscription(actor: SessionUser, endpoint: string): Promise<void> {
  await deleteOwnSubscription(getPool(), actor.schoolId, actor.id, endpoint);
}
