import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Locally DATABASE_URL comes from .env; CI sets it directly, so a missing file is fine there.
try {
  process.loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

// The tests empty tables between cases, so they get TEST_DATABASE_URL. CI has only a throwaway database and sets CI=true.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else if (process.env.CI !== 'true') throw new Error('Set TEST_DATABASE_URL in .env: integration tests must not run against the development database.');

/** Tests that need a real, migrated PostgreSQL. Named *.integration.test.ts and kept out of the unit run. */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // Outside Next.js the marker package throws; tests are server code, so give them its empty build.
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    include: ['features/**/*.integration.test.ts', 'shared/**/*.integration.test.ts'],
    environment: 'node',
    // One database: run files one after another so their data never meets.
    fileParallelism: false,
  },
});
