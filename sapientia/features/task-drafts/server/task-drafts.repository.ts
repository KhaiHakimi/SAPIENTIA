import 'server-only';
import type { Queryable } from '@/shared/server/database.service';

export type AiOutcome = 'ok' | 'bad_output' | 'failed';

/** Every person the school holds a name for (staff, pupils, guardians), for redaction only: none of it leaves the server. */
export async function listSchoolNames(db: Queryable, schoolId: string): Promise<string[]> {
  const { rows } = await db.query<{ name: string }>(
    `SELECT name FROM users WHERE school_id = $1
     UNION SELECT name FROM students WHERE school_id = $1
     UNION SELECT name FROM guardians WHERE school_id = $1`,
    [schoolId],
  );
  return rows.map((row) => row.name);
}

/**
 * Holds this person's row until the transaction ends, so two requests from them at once take turns at counting and
 * recording against the hourly limit.
 */
export async function lockRequester(db: Queryable, schoolId: string, userId: string): Promise<void> {
  await db.query('SELECT 1 FROM users WHERE school_id = $1 AND id = $2 FOR UPDATE', [schoolId, userId]);
}

/** How many requests this person made since the given time, and when the oldest of them was. */
export async function countRecentRequests(db: Queryable, schoolId: string, userId: string, since: Date) {
  const { rows } = await db.query<{ count: number; oldest: Date | null }>(
    `SELECT count(*)::int AS count, min(created_at) AS oldest FROM ai_requests
      WHERE school_id = $1 AND user_id = $2 AND created_at > $3`,
    [schoolId, userId, since],
  );
  return rows[0];
}

/** Who asked, when, and how it went; never the text. Returns the row's id, for recording the outcome later. */
export async function insertRequest(db: Queryable, schoolId: string, userId: string, outcome: AiOutcome, now: Date): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO ai_requests (school_id, user_id, feature, outcome, created_at) VALUES ($1, $2, 'task_draft', $3, $4) RETURNING id`,
    [schoolId, userId, outcome, now],
  );
  return rows[0].id;
}

export async function setRequestOutcome(db: Queryable, schoolId: string, requestId: string, outcome: AiOutcome): Promise<void> {
  await db.query('UPDATE ai_requests SET outcome = $3 WHERE school_id = $1 AND id = $2', [schoolId, requestId, outcome]);
}
