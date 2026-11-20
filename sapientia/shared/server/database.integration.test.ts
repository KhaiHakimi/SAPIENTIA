import { afterAll, describe, expect, it } from 'vitest';
import { checkHealth } from '@/features/health/services/health.service';
import { closePool, getPool, pingDatabase } from './database.service';

/** Needs a migrated database: `npm run db:up`, `npm run db:migrate`, then `npm run test:integration`. */
describe('database (integration)', () => {
  afterAll(closePool);

  it('answers the health check', async () => {
    await expect(checkHealth(pingDatabase)).resolves.toEqual({ status: 'ok', checks: { database: 'up' } });
  });

  it('has the schools table from the first migration, with case-insensitive unique codes', async () => {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO schools (code, name) VALUES ('TST0001', 'Sekolah Ujian')`);
      await expect(client.query(`INSERT INTO schools (code, name) VALUES ('tst0001', 'Pendua')`)).rejects.toThrow(
        /schools_code_unique/,
      );
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
