import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Locally DATABASE_URL comes from .env; CI sets it directly, so a missing file is fine there.
try {
  process.loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

/** Tests that need a real, migrated PostgreSQL. Named *.integration.test.ts and kept out of the unit run. */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['features/**/*.integration.test.ts', 'shared/**/*.integration.test.ts'],
    environment: 'node',
    // One database: run files one after another so their data never meets.
    fileParallelism: false,
  },
});
