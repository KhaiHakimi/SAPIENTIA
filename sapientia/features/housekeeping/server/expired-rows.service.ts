import 'server-only';
import { SESSION_IDLE_MINUTES, THROTTLE_WINDOW_MINUTES } from '@/features/auth/constants/session.constants';
import { GUARDIAN_SESSION_IDLE_MINUTES } from '@/features/guardians/constants/guardians.constants';
import { STUDENT_SESSION_IDLE_MINUTES } from '@/features/students/constants/students.constants';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { getPool, type Queryable } from '@/shared/server/database.service';
import { KEY_LIFETIME_HOURS } from '@/shared/server/idempotency.service';
import { logger } from '@/shared/server/logger.service';
import { EXPIRED_ROWS_BATCH, EXPIRED_ROWS_MAX_BATCHES } from '../constants/housekeeping.constants';
import type { ExpiryRule } from '../interfaces/housekeeping.interface';

const MINUTE_MS = 60_000;

/**
 * Each table and the condition that makes a row useless. A session past its absolute limit, or idle for longer than its
 * idle limit, is refused when presented and only removed then, so one never presented again would stay for ever. Table
 * names come from this list only, never from input.
 */
function expiryRules(now: Date): ExpiryRule[] {
  const before = (minutes: number) => new Date(now.getTime() - minutes * MINUTE_MS);
  const session = (table: string, idleMinutes: number): ExpiryRule =>
    ({ table, where: 'expires_at <= $1 OR last_seen_at <= $2', params: [now, before(idleMinutes)] });
  return [
    session('sessions', SESSION_IDLE_MINUTES),
    session('student_sessions', STUDENT_SESSION_IDLE_MINUTES),
    session('guardian_sessions', GUARDIAN_SESSION_IDLE_MINUTES),
    { table: 'mfa_challenges', where: 'expires_at <= $1', params: [now] },
    // A key is honoured for a day (runIdempotent); after that the same key starts afresh anyway.
    { table: 'idempotency_keys', where: 'created_at <= $1', params: [before(KEY_LIFETIME_HOURS * 60)] },
    // A window that has ended counts for nothing: the next failure starts a new one.
    { table: 'auth_throttle', where: 'window_started_at <= $1', params: [before(THROTTLE_WINDOW_MINUTES)] },
  ];
}

/** Removes one table's useless rows a batch at a time, each batch its own short statement. */
async function removeInBatches(db: Queryable, rule: ExpiryRule): Promise<number> {
  const limit = `$${rule.params.length + 1}`;
  let total = 0;
  for (let batch = 0; batch < EXPIRED_ROWS_MAX_BATCHES; batch++) {
    const { rowCount } = await db.query(
      `DELETE FROM ${rule.table} WHERE ctid IN (SELECT ctid FROM ${rule.table} WHERE ${rule.where} LIMIT ${limit})`,
      [...rule.params, EXPIRED_ROWS_BATCH],
    );
    total += rowCount ?? 0;
    if ((rowCount ?? 0) < EXPIRED_ROWS_BATCH) break;
  }
  return total;
}

/**
 * Removes sessions, two-step challenges, idempotency keys and sign-in throttle rows that can no longer be used (the
 * worker runs it every hour). Nothing here is read again once expired, so keeping it only keeps token hashes and
 * addresses longer than needed. Returns how many rows went from each table.
 */
export async function deleteExpiredRows(clock: Clock, db: Queryable = getPool()): Promise<Record<string, number>> {
  const removed: Record<string, number> = {};
  for (const rule of expiryRules(clock.now())) removed[rule.table] = await removeInBatches(db, rule);
  if (Object.values(removed).some((count) => count > 0)) logger.info('housekeeping.expired_rows_deleted', removed);
  return removed;
}
