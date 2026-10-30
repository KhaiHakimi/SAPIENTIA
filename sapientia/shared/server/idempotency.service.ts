import 'server-only';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { ConflictError } from './app-errors';

/** A key is honoured for a day; after that the same key starts afresh. */
const KEY_LIFETIME_HOURS = 24;

export interface StoredResponse<T> {
  status: number;
  body: T;
}

/**
 * Runs fn at most once per (user, Idempotency-Key). The key row is inserted first, inside the caller's transaction, so a
 * concurrent duplicate waits on the unique index until the first commits and then replays its response. The same key with
 * a different body is refused rather than silently answered with the other request's result.
 */
export async function runIdempotent<T>(
  client: PoolClient,
  scope: { schoolId: string; userId: string; key: string },
  requestBody: unknown,
  fn: () => Promise<StoredResponse<T>>,
): Promise<StoredResponse<T>> {
  const requestHash = createHash('sha256').update(JSON.stringify(requestBody)).digest();
  await client.query(
    `DELETE FROM idempotency_keys WHERE user_id = $1 AND key = $2 AND created_at < now() - make_interval(hours => $3)`,
    [scope.userId, scope.key, KEY_LIFETIME_HOURS],
  );
  const inserted = await client.query(
    `INSERT INTO idempotency_keys (user_id, key, school_id, request_hash) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, key) DO NOTHING RETURNING key`,
    [scope.userId, scope.key, scope.schoolId, requestHash],
  );

  if (inserted.rowCount === 0) {
    const { rows } = await client.query<{ request_hash: Buffer; status_code: number | null; response: T }>(
      'SELECT request_hash, status_code, response FROM idempotency_keys WHERE user_id = $1 AND key = $2',
      [scope.userId, scope.key],
    );
    const previous = rows[0];
    if (!previous || !previous.request_hash.equals(requestHash)) {
      throw new ConflictError('This Idempotency-Key was already used for a different request.', { idempotencyKey: 'reused' });
    }
    if (previous.status_code === null) throw new ConflictError('The first request with this key is still in progress.');
    return { status: previous.status_code, body: previous.response };
  }

  const result = await fn();
  await client.query('UPDATE idempotency_keys SET status_code = $3, response = $4 WHERE user_id = $1 AND key = $2', [
    scope.userId, scope.key, result.status, JSON.stringify(result.body),
  ]);
  return result;
}
