import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Unit tests for the pure rules (services). Tests sit next to the file they test, named *.test.ts. */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['features/**/*.test.ts', 'shared/**/*.test.ts'],
    // Database tests have their own config (vitest.integration.config.mts) because they need PostgreSQL.
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    environment: 'node',
  },
});
