import { Pool } from 'pg';

/** Server-only: import this from route handlers and server code, never from a 'use client' file. */

const POOL_SETTINGS = {
  max: 10,
  connectionTimeoutMillis: 3_000,
  idleTimeoutMillis: 30_000,
  // A runaway query fails instead of holding a connection; raise it per query if a report ever needs longer.
  statement_timeout: 5_000,
};

// Kept on globalThis so hot reload in `next dev` reuses one pool instead of opening a new one per edit.
const globalForPool = globalThis as typeof globalThis & { sapientiaPool?: Pool };

/** Reads the connection string; fails loudly so a missing .env is obvious rather than a vague connection error. */
export function readDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  return url;
}

export function getPool(): Pool {
  if (!globalForPool.sapientiaPool) {
    const pool = new Pool({ connectionString: readDatabaseUrl(), ...POOL_SETTINGS });
    // An idle client can drop (database restart); without a listener the error would crash the process.
    pool.on('error', (error) => console.error('[database] idle client error:', error.message));
    globalForPool.sapientiaPool = pool;
  }
  return globalForPool.sapientiaPool;
}

/** Round trip to the database; rejects if it cannot be reached. */
export async function pingDatabase(): Promise<void> {
  await getPool().query('SELECT 1');
}

/** Closes the pool (tests and shutdown). */
export async function closePool(): Promise<void> {
  const pool = globalForPool.sapientiaPool;
  globalForPool.sapientiaPool = undefined;
  await pool?.end();
}
