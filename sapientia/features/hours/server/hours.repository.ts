import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type { HoursEntry, HoursKind, HoursShare, SharedHoursTotal } from '../interfaces/hours.interface';

/**
 * The only code that touches private_hours_log and private_hours_shares (private-hours-isolation.test.ts fails if any other
 * file does). Every function takes the school and the owner, and every statement filters on both: "school_id = $1 AND
 * user_id = $2". The owner always comes from the session, never from the request, so nobody can name someone else's log.
 */

interface EntryRow {
  id: string;
  on_date: string;
  minutes: number;
  kind: HoursKind;
  note: string | null;
}

/** The owner's entries between two dates (inclusive), newest first. */
export async function listOwnEntries(
  db: Queryable,
  schoolId: string,
  ownerId: string,
  range: { from: string; to: string },
  limit: number,
): Promise<HoursEntry[]> {
  const { rows } = await db.query<EntryRow>(
    `SELECT id, on_date::text AS on_date, minutes, kind, note FROM private_hours_log
      WHERE school_id = $1 AND user_id = $2 AND on_date BETWEEN $3::date AND $4::date
      ORDER BY on_date DESC, created_at DESC, id LIMIT $5`,
    [schoolId, ownerId, range.from, range.to, limit],
  );
  return rows.map((row) => ({ id: row.id, onDate: row.on_date, minutes: row.minutes, kind: row.kind, note: row.note }));
}

/** The owner's total between two dates (inclusive), counting every entry, not only those listed. */
export async function sumOwnMinutes(
  db: Queryable,
  schoolId: string,
  ownerId: string,
  range: { from: string; to: string },
): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    `SELECT COALESCE(sum(minutes), 0)::int AS total FROM private_hours_log
      WHERE school_id = $1 AND user_id = $2 AND on_date BETWEEN $3::date AND $4::date`,
    [schoolId, ownerId, range.from, range.to],
  );
  return rows[0].total;
}

export async function insertOwnEntry(
  db: Queryable,
  schoolId: string,
  ownerId: string,
  entry: { onDate: string; minutes: number; kind: HoursKind; note: string | null; now: Date },
): Promise<HoursEntry> {
  const { rows } = await db.query<EntryRow>(
    `INSERT INTO private_hours_log (school_id, user_id, on_date, minutes, kind, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, on_date::text AS on_date, minutes, kind, note`,
    [schoolId, ownerId, entry.onDate, entry.minutes, entry.kind, entry.note, entry.now],
  );
  const row = rows[0];
  return { id: row.id, onDate: row.on_date, minutes: row.minutes, kind: row.kind, note: row.note };
}

/** Deletes one of the owner's entries; false when there is no such entry of theirs (someone else's looks the same). */
export async function deleteOwnEntry(db: Queryable, schoolId: string, ownerId: string, entryId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    'DELETE FROM private_hours_log WHERE school_id = $1 AND user_id = $2 AND id = $3',
    [schoolId, ownerId, entryId],
  );
  return (rowCount ?? 0) > 0;
}

/** month is the first day of the month, YYYY-MM-01. */
export async function findOwnShare(db: Queryable, schoolId: string, ownerId: string, month: string): Promise<HoursShare | null> {
  const { rows } = await db.query<{ minutes: number; shared_at: Date }>(
    'SELECT minutes, shared_at FROM private_hours_shares WHERE school_id = $1 AND user_id = $2 AND month = $3::date',
    [schoolId, ownerId, month],
  );
  return rows[0] ? { minutes: rows[0].minutes, sharedAt: rows[0].shared_at.toISOString() } : null;
}

/** Shares (or shares again) the owner's total for a month: the figure given, which the caller has just summed. */
export async function upsertOwnShare(
  db: Queryable,
  schoolId: string,
  ownerId: string,
  share: { month: string; minutes: number; now: Date },
): Promise<void> {
  await db.query(
    `INSERT INTO private_hours_shares (school_id, user_id, month, minutes, shared_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (school_id, user_id, month) DO UPDATE SET minutes = EXCLUDED.minutes, shared_at = EXCLUDED.shared_at`,
    [schoolId, ownerId, share.month, share.minutes, share.now],
  );
}

export async function deleteOwnShare(db: Queryable, schoolId: string, ownerId: string, month: string): Promise<boolean> {
  const { rowCount } = await db.query(
    'DELETE FROM private_hours_shares WHERE school_id = $1 AND user_id = $2 AND month = $3::date',
    [schoolId, ownerId, month],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * The totals staff of a school chose to share for a month, for the monthly report. This is the one statement that is not
 * filtered on an owner: it reads private_hours_shares only (the figures owners chose to share), never private_hours_log.
 * private-hours-isolation.test.ts allows exactly this shape. Ordered by name, so the list reads as a register, not a ranking.
 */
export async function listSchoolShares(db: Queryable, schoolId: string, month: string): Promise<SharedHoursTotal[]> {
  const { rows } = await db.query<{ user_id: string; name: string; minutes: number; shared_at: Date }>(
    `SELECT s.user_id, u.name, s.minutes, s.shared_at FROM private_hours_shares s
       JOIN users u ON u.id = s.user_id AND u.school_id = s.school_id
      WHERE s.school_id = $1 AND s.month = $2::date ORDER BY u.name, s.user_id`,
    [schoolId, month],
  );
  return rows.map((row) => ({ userId: row.user_id, name: row.name, minutes: row.minutes, sharedAt: row.shared_at.toISOString() }));
}
