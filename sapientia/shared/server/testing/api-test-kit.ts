import { hashPassword } from '@/features/auth/server/password.service';
import { getPool } from '@/shared/server/database.service';

/**
 * Helpers for integration tests: build real Requests, call route handlers directly (no server), and set up fictional
 * schools and staff. Only *.integration.test.ts files import this.
 */

export const TEST_ORIGIN = 'http://localhost:3000';
export const TEST_PASSWORD = 'correct-horse-battery';

/** Every application table, children first. pg-boss keeps its own schema and is cleared separately when needed. */
const APP_TABLES = [
  'calendar_events', 'school_settings', 'idempotency_keys', 'audit_logs', 'task_comments', 'task_assignments', 'tasks',
  'auth_throttle', 'invites', 'sessions', 'users', 'schools',
];

export async function resetDatabase(extraTables: readonly string[] = []): Promise<void> {
  await getPool().query(`TRUNCATE ${[...extraTables, ...APP_TABLES].join(', ')} RESTART IDENTITY CASCADE`);
}

/** Removes queued delivery jobs, so a test can count the ones it created. */
export async function clearQueuedJobs(): Promise<void> {
  await getPool().query(`DELETE FROM pgboss.job WHERE name = 'deliver-task'`);
}

let passwordHash: Promise<string> | undefined;

export async function createSchool(code: string, name = `Sekolah ${code}`): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>('INSERT INTO schools (code, name) VALUES ($1, $2) RETURNING id', [code, name]);
  return rows[0].id;
}

export async function createUser(
  schoolId: string,
  email: string,
  role: 'admin' | 'sender' | 'teacher',
  status: 'active' | 'invited' | 'disabled' = 'active',
): Promise<string> {
  passwordHash ??= hashPassword(TEST_PASSWORD);
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO users (school_id, email, name, role, status, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [schoolId, email, email.split('@')[0], role, status, status === 'invited' ? null : await passwordHash],
  );
  return rows[0].id;
}

export interface CallOptions {
  method?: string;
  body?: unknown;
  cookie?: string | null;
  headers?: Record<string, string>;
  /** Dynamic route segments, passed the way Next.js passes them (a promise). */
  params?: Record<string, string>;
}

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Calls a route handler as a same-origin browser would: Origin set, JSON body, cookie if given. */
export async function call(handler: unknown, path: string, options: CallOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { origin: TEST_ORIGIN, ...options.headers };
  if (options.cookie) headers.cookie = options.cookie;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  const request = new Request(`${TEST_ORIGIN}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return (handler as Handler)(request, { params: Promise.resolve(options.params ?? {}) });
}

/** The name=value part of a Set-Cookie header, ready to send back. */
export function cookieFrom(response: Response): string {
  const header = response.headers.get('set-cookie');
  if (!header) throw new Error(`No Set-Cookie on a ${response.status} response.`);
  return header.split(';')[0];
}

export async function errorCode(response: Response): Promise<string> {
  const body = (await response.json()) as { error?: { code?: string } };
  return body.error?.code ?? '(no error body)';
}
