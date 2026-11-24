import { randomBytes } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { fixedClock } from '@/shared/server/clock.service';
import { closePool, getPool } from '@/shared/server/database.service';
import { createSchool, createUser, resetDatabase } from '@/shared/server/testing/api-test-kit';
import { deleteExpiredRows } from './expired-rows.service';

const NOW = new Date('2026-11-23T10:00:00+08:00');
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
const token = () => randomBytes(32);

describe('removing expired sign-in rows', () => {
  let school: string;
  let user: string;
  let student: string;
  let guardian: string;

  const insert = (sql: string, params: unknown[]) => getPool().query(sql, params);
  const left = async (table: string, column: string) =>
    (await getPool().query<{ value: string }>(`SELECT ${column}::text AS value FROM ${table} ORDER BY 1`)).rows.map((row) => row.value);

  beforeEach(async () => {
    await resetDatabase();
    school = await createSchool('A001');
    user = await createUser(school, 'guru@a.test', 'teacher');
    ({ rows: [{ id: student }] } = await getPool().query<{ id: string }>(
      `INSERT INTO students (school_id, name, username, password_hash, must_change_password) VALUES ($1, 'Aisyah', 'aisyah0001', 'x', false)
       RETURNING id`, [school],
    ));
    ({ rows: [{ id: guardian }] } = await getPool().query<{ id: string }>(
      `INSERT INTO guardians (school_id, name, username, password_hash, must_change_password) VALUES ($1, 'Rahman', 'penjaga.rahman0001', 'x', false)
       RETURNING id`, [school],
    ));
  });

  afterAll(async () => {
    await closePool();
  });

  it('removes what can no longer be used and keeps everything still live', async () => {
    // Sessions: past the absolute limit, idle too long, and live. Staff and guardians idle out at 60 minutes, pupils at 30.
    const sessions = [
      ['sessions', 'user_id', user, 60], ['student_sessions', 'student_id', student, 30], ['guardian_sessions', 'guardian_id', guardian, 60],
    ] as const;
    for (const [table, owner, ownerId, idle] of sessions) {
      for (const [lastSeen, expires] of [[ago(5), ago(1)], [ago(idle + 1), later(300)], [ago(idle - 1), later(300)]] as const) {
        await insert(
          `INSERT INTO ${table} (token_hash, school_id, ${owner}, created_at, last_seen_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)`,
          [token(), school, ownerId, ago(600), lastSeen, expires],
        );
      }
    }
    await insert('INSERT INTO mfa_challenges (token_hash, school_id, user_id, expires_at) VALUES ($1, $2, $3, $4), ($5, $2, $3, $6)', [
      token(), school, user, ago(1), token(), later(4),
    ]);
    await insert(
      `INSERT INTO idempotency_keys (user_id, key, school_id, request_hash, created_at) VALUES ($1, 'old-key-1', $2, $3, $4), ($1, 'new-key-1', $2, $3, $5)`,
      [user, school, token(), ago(24 * 60 + 1), ago(24 * 60 - 1)],
    );
    await insert('INSERT INTO auth_throttle (key, window_started_at, failures) VALUES ($1, $2, 5), ($3, $4, 5)', [
      'email:old@a.test', ago(16), 'email:new@a.test', ago(14),
    ]);

    expect(await deleteExpiredRows(fixedClock(NOW))).toEqual({
      sessions: 2, student_sessions: 2, guardian_sessions: 2, mfa_challenges: 1, idempotency_keys: 1, auth_throttle: 1,
    });
    for (const [table] of sessions) expect(await left(table, 'count(*)')).toEqual(['1']);
    expect(await left('mfa_challenges', 'count(*)')).toEqual(['1']);
    expect(await left('idempotency_keys', 'key')).toEqual(['new-key-1']);
    expect(await left('auth_throttle', 'key')).toEqual(['email:new@a.test']);
    // A second run finds nothing more.
    expect(Object.values(await deleteExpiredRows(fixedClock(NOW))).every((count) => count === 0)).toBe(true);
  });
});
