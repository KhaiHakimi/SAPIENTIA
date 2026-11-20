import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import { E2E_PASSWORD, e2eDatabaseUrl } from './support/e2e-env';

const NODE_FLAGS = ['--env-file-if-exists=.env', '--conditions=react-server', '--import', 'tsx'];

/** Runs one of the project's own Node scripts against the end-to-end database. Values set here win over those in .env. */
function runScript(args: string[], databaseUrl: string): void {
  execFileSync(process.execPath, args, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl, TEST_DATABASE_URL: databaseUrl, SEED_PASSWORD: E2E_PASSWORD },
  });
}

/**
 * Before the journeys: migrate the end-to-end database, empty every application table (and queued jobs), and seed the
 * fictional schools. Each run therefore starts from the same known state.
 */
export default async function globalSetup(): Promise<void> {
  const databaseUrl = e2eDatabaseUrl();
  runScript(['--env-file-if-exists=.env', 'node_modules/node-pg-migrate/bin/node-pg-migrate.js', 'up', '--check-order'], databaseUrl);
  runScript([...NODE_FLAGS, 'scripts/install-queues.ts'], databaseUrl);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // Read from the catalogue so a new migration's tables are emptied without a list to keep up to date.
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'pgmigrations'`,
    );
    const tables = rows.map((row) => `"${row.tablename.replaceAll('"', '""')}"`);
    if (tables.length) await client.query(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
    await client.query('DELETE FROM pgboss.job');
  } finally {
    await client.end();
  }

  runScript([...NODE_FLAGS, 'seeds/dev-seed.ts'], databaseUrl);
}
