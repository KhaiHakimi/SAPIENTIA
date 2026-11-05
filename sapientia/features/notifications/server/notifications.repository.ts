import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type { PushSubscriptionInput } from '../interfaces/notification.interface';

/** Every function takes schoolId first and filters on it, like the other repositories (plan Sprint 3). */

export async function readEmailPreference(db: Queryable, schoolId: string, userId: string): Promise<boolean> {
  const { rows } = await db.query<{ notify_by_email: boolean }>(
    'SELECT notify_by_email FROM users WHERE school_id = $1 AND id = $2',
    [schoolId, userId],
  );
  return rows[0]?.notify_by_email ?? false;
}

export async function writeEmailPreference(db: Queryable, schoolId: string, userId: string, enabled: boolean): Promise<void> {
  await db.query('UPDATE users SET notify_by_email = $3, updated_at = now() WHERE school_id = $1 AND id = $2', [schoolId, userId, enabled]);
}

/** A browser has one endpoint; if someone else on this device subscribed before, the device now belongs to this user. */
export async function upsertSubscription(db: Queryable, schoolId: string, userId: string, input: PushSubscriptionInput): Promise<void> {
  await db.query(
    `INSERT INTO push_subscriptions (school_id, user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
       SET school_id = EXCLUDED.school_id, user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, created_at = now()`,
    [schoolId, userId, input.endpoint, input.keys.p256dh, input.keys.auth],
  );
}

/** Removes the caller's own subscription only; another user's endpoint is left alone and the result looks the same. */
export async function deleteOwnSubscription(db: Queryable, schoolId: string, userId: string, endpoint: string): Promise<void> {
  await db.query('DELETE FROM push_subscriptions WHERE school_id = $1 AND user_id = $2 AND endpoint = $3', [schoolId, userId, endpoint]);
}

export async function deleteSubscriptionById(db: Queryable, schoolId: string, id: string): Promise<void> {
  await db.query('DELETE FROM push_subscriptions WHERE school_id = $1 AND id = $2', [schoolId, id]);
}

export interface NoticeTaskRow {
  id: string;
  school_id: string;
  title: string;
  due_on: string;
  sender_name: string;
}

/** The task only once it is delivered: a held task has nothing to announce, whoever asks. Not school-scoped: the job has only the id. */
export async function findDeliveredTask(db: Queryable, taskId: string): Promise<NoticeTaskRow | null> {
  const { rows } = await db.query<NoticeTaskRow>(
    `SELECT t.id, t.school_id, t.title, t.due_on::text AS due_on, c.name AS sender_name
       FROM tasks t JOIN users c ON c.school_id = t.school_id AND c.id = t.created_by
      WHERE t.id = $1 AND t.delivered_at IS NOT NULL`,
    [taskId],
  );
  return rows[0] ?? null;
}

export interface RecipientRow {
  user_id: string;
  name: string;
  email: string;
  notify_by_email: boolean;
}

/** Active assignees only: a disabled account gets nothing. */
export async function listRecipients(db: Queryable, schoolId: string, taskId: string): Promise<RecipientRow[]> {
  const { rows } = await db.query<RecipientRow>(
    `SELECT u.id AS user_id, u.name, u.email, u.notify_by_email
       FROM task_assignments a JOIN users u ON u.school_id = a.school_id AND u.id = a.user_id
      WHERE a.school_id = $1 AND a.task_id = $2 AND u.status = 'active'
      ORDER BY u.id`,
    [schoolId, taskId],
  );
  return rows;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function listSubscriptions(db: Queryable, schoolId: string, userIds: readonly string[]): Promise<SubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const { rows } = await db.query<SubscriptionRow>(
    `SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE school_id = $1 AND user_id = ANY($2::uuid[]) ORDER BY id`,
    [schoolId, userIds],
  );
  return rows;
}

/** Keys of what already went out for this task: "<user id>|<channel>|<target>". */
export async function listSentKeys(db: Queryable, schoolId: string, taskId: string): Promise<Set<string>> {
  const { rows } = await db.query<{ user_id: string; channel: string; target: string }>(
    'SELECT user_id, channel, target FROM notification_sends WHERE school_id = $1 AND task_id = $2',
    [schoolId, taskId],
  );
  return new Set(rows.map((row) => `${row.user_id}|${row.channel}|${row.target}`));
}

export async function recordSent(
  db: Queryable,
  schoolId: string,
  sent: { taskId: string; userId: string; channel: 'email' | 'push'; target: string; at: Date },
): Promise<void> {
  await db.query(
    `INSERT INTO notification_sends (school_id, task_id, user_id, channel, target, sent_at) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [schoolId, sent.taskId, sent.userId, sent.channel, sent.target, sent.at],
  );
}
