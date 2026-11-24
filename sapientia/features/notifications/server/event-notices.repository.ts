import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type { NotificationChannel } from '../interfaces/notification.interface';
import type { RecipientRow } from './notifications.repository';

/** What the extension and relief messages are built from. Every function takes schoolId first and filters on it. */

export interface ExtensionNoticeRow {
  task_id: string;
  task_title: string;
  sender_id: string;
  requested_by: string;
  requester_name: string;
  status: 'pending' | 'approved' | 'countered';
  current_due_on: string;
  requested_due_on: string;
  decided_due_on: string | null;
  decider_name: string | null;
  /** The person who asked has finished the task since, which closes a request still unanswered. */
  requester_done: boolean;
}

export async function findExtensionForNotice(db: Queryable, schoolId: string, extensionId: string): Promise<ExtensionNoticeRow | null> {
  const { rows } = await db.query<ExtensionNoticeRow>(
    `SELECT e.task_id, t.title AS task_title, t.created_by AS sender_id, e.requested_by, r.name AS requester_name, e.status,
            e.current_due_on::text AS current_due_on, e.requested_due_on::text AS requested_due_on,
            e.decided_due_on::text AS decided_due_on, d.name AS decider_name, a.status = 'done' AS requester_done
       FROM extension_requests e
       JOIN tasks t ON t.id = e.task_id AND t.school_id = e.school_id
       JOIN users r ON r.id = e.requested_by AND r.school_id = e.school_id
       JOIN task_assignments a ON a.task_id = e.task_id AND a.user_id = e.requested_by AND a.school_id = e.school_id
       LEFT JOIN users d ON d.id = e.decided_by AND d.school_id = e.school_id
      WHERE e.school_id = $1 AND e.id = $2`,
    [schoolId, extensionId],
  );
  return rows[0] ?? null;
}

export interface ReliefNoticeRow {
  relief_teacher_id: string;
  absent_teacher_name: string;
  on_date: string;
  start_time: string;
  end_time: string;
  class_name: string | null;
  subject_name: string | null;
  label: string | null;
}

export async function findReliefForNotice(db: Queryable, schoolId: string, reliefId: string): Promise<ReliefNoticeRow | null> {
  const { rows } = await db.query<ReliefNoticeRow>(
    `SELECT r.relief_teacher_id, a.name AS absent_teacher_name, r.on_date::text AS on_date,
            to_char(r.start_time, 'HH24:MI') AS start_time, to_char(r.end_time, 'HH24:MI') AS end_time,
            c.name AS class_name, j.name AS subject_name, s.label
       FROM relief_assignments r
       JOIN users a ON a.id = r.absent_teacher_id AND a.school_id = r.school_id
       JOIN timetable_slots s ON s.id = r.slot_id AND s.school_id = r.school_id
       LEFT JOIN classes c ON c.id = s.class_id AND c.school_id = s.school_id
       LEFT JOIN subjects j ON j.id = s.subject_id AND j.school_id = s.school_id
      WHERE r.school_id = $1 AND r.id = $2`,
    [schoolId, reliefId],
  );
  return rows[0] ?? null;
}

export async function findStaffName(db: Queryable, schoolId: string, userId: string): Promise<string | null> {
  const { rows } = await db.query<{ name: string }>('SELECT name FROM users WHERE school_id = $1 AND id = $2', [schoolId, userId]);
  return rows[0]?.name ?? null;
}

/** The person to message, only while their account is active: a disabled account gets nothing. */
export async function findActiveRecipient(db: Queryable, schoolId: string, userId: string): Promise<RecipientRow | null> {
  const { rows } = await db.query<RecipientRow>(
    `SELECT id AS user_id, name, email, notify_by_email FROM users WHERE school_id = $1 AND id = $2 AND status = 'active'`,
    [schoolId, userId],
  );
  return rows[0] ?? null;
}

/** Keys of what already went out for this notice: "<user id>|<channel>|<target>". */
export async function listEventSentKeys(db: Queryable, schoolId: string, noticeKey: string): Promise<Set<string>> {
  const { rows } = await db.query<{ user_id: string; channel: string; target: string }>(
    'SELECT user_id, channel, target FROM event_notice_sends WHERE school_id = $1 AND notice_key = $2',
    [schoolId, noticeKey],
  );
  return new Set(rows.map((row) => `${row.user_id}|${row.channel}|${row.target}`));
}

export async function recordEventSent(
  db: Queryable,
  schoolId: string,
  sent: { noticeKey: string; userId: string; channel: NotificationChannel; target: string; at: Date },
): Promise<void> {
  await db.query(
    `INSERT INTO event_notice_sends (school_id, notice_key, user_id, channel, target, sent_at) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [schoolId, sent.noticeKey, sent.userId, sent.channel, sent.target, sent.at],
  );
}
