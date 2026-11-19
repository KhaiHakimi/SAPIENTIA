import 'server-only';
import type { Queryable } from '@/shared/server/database.service';

/** Weekly digest rows. Every function but listSchoolIds takes schoolId first and filters on it. */

export async function listSchoolIds(db: Queryable): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>('SELECT id FROM schools ORDER BY id');
  return rows.map((row) => row.id);
}

export interface DigestRecipientRow {
  id: string;
  name: string;
  email: string;
}

/** Active staff with the digest on who have no record for this week yet. */
export async function listDueRecipients(db: Queryable, schoolId: string, weekOf: string): Promise<DigestRecipientRow[]> {
  const { rows } = await db.query<DigestRecipientRow>(
    `SELECT u.id, u.name, u.email FROM users u
      WHERE u.school_id = $1 AND u.status = 'active' AND u.removed_at IS NULL AND u.weekly_digest
        AND NOT EXISTS (SELECT 1 FROM digest_sends d WHERE d.user_id = u.id AND d.week_of = $2::date)
      ORDER BY u.id`,
    [schoolId, weekOf],
  );
  return rows;
}

export interface OpenWorkRow {
  id: string;
  title: string;
  my_due_on: string;
  total: number;
}

/**
 * This person's delivered, unfinished tasks due on or before `toDate` (their own date, after any extension), soonest first:
 * those before `today` are overdue, the rest due this week. Counts come back with the rows so the email can say "and 3 more".
 */
export async function listOpenWork(db: Queryable, schoolId: string, userId: string, today: string, toDate: string, limit: number) {
  const { rows } = await db.query<OpenWorkRow & { overdue: boolean }>(
    `WITH open AS (
       SELECT t.id, t.title, COALESCE(a.due_on, t.due_on) AS my_due_on
         FROM task_assignments a JOIN tasks t ON t.id = a.task_id AND t.school_id = a.school_id
        WHERE a.school_id = $1 AND a.user_id = $2 AND a.status <> 'done' AND t.delivered_at IS NOT NULL
          AND COALESCE(a.due_on, t.due_on) <= $4::date
     ), ranked AS (
       SELECT id, title, my_due_on, my_due_on < $3::date AS overdue,
              row_number() OVER (PARTITION BY my_due_on < $3::date ORDER BY my_due_on, id) AS position,
              count(*) OVER (PARTITION BY my_due_on < $3::date)::int AS total
         FROM open
     )
     SELECT id, title, my_due_on::text AS my_due_on, overdue, total FROM ranked WHERE position <= $5 ORDER BY my_due_on, id`,
    [schoolId, userId, today, toDate, limit],
  );
  return rows;
}

/** Requests for more time on tasks this person sent that are still waiting for an answer. */
export async function countWaitingExtensions(db: Queryable, schoolId: string, userId: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM extension_requests e
       JOIN tasks t ON t.id = e.task_id AND t.school_id = e.school_id
      WHERE e.school_id = $1 AND t.created_by = $2 AND e.status = 'pending'`,
    [schoolId, userId],
  );
  return rows[0].count;
}

/** One row per person per week; a second sweep that reaches the same person does nothing. */
export async function recordDigest(
  db: Queryable,
  schoolId: string,
  userId: string,
  weekOf: string,
  outcome: 'sent' | 'empty' | 'failed',
  now: Date,
): Promise<void> {
  await db.query(
    `INSERT INTO digest_sends (school_id, user_id, week_of, outcome, created_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, week_of) DO NOTHING`,
    [schoolId, userId, weekOf, outcome, now],
  );
}

export async function readDigestPreference(db: Queryable, schoolId: string, userId: string): Promise<boolean> {
  const { rows } = await db.query<{ weekly_digest: boolean }>('SELECT weekly_digest FROM users WHERE school_id = $1 AND id = $2', [schoolId, userId]);
  return rows[0]?.weekly_digest ?? false;
}

export async function writeDigestPreference(db: Queryable, schoolId: string, userId: string, enabled: boolean): Promise<void> {
  await db.query('UPDATE users SET weekly_digest = $3, updated_at = now() WHERE school_id = $1 AND id = $2', [schoolId, userId, enabled]);
}
