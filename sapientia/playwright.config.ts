import { defineConfig, devices } from '@playwright/test';
import { E2E_ORIGIN, E2E_PORT, e2eDatabaseUrl } from './e2e/support/e2e-env';

const databaseUrl = e2eDatabaseUrl();

/**
 * End-to-end journeys (plan Sprint 5), run with `npm run test:e2e`. They build the app and start it on port 3100 against the
 * test database, so the development database is untouched. Locally they drive the installed Microsoft Edge; CI downloads Chromium.
 * Each journey runs twice: on a desktop window and on a phone-sized screen (definition of done).
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // One database and shared seed accounts: run the journeys one after another.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: E2E_ORIGIN,
    channel: process.env.CI ? undefined : 'msedge',
    locale: 'ms-MY',
    timezoneId: 'Asia/Kuala_Lumpur',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { viewport: devices['Pixel 7'].viewport, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    // A production build, not the dev server: its file watcher reloads pages mid-test whenever files change underneath it
    // (an editor saving, a sync client touching the folder), and a build is also what gets deployed.
    command: `npx next build && npx next start --port ${E2E_PORT}`,
    url: `${E2E_ORIGIN}/health`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { DATABASE_URL: databaseUrl, APP_ORIGIN: '', NEXT_TELEMETRY_DISABLED: '1' },
  },
});
