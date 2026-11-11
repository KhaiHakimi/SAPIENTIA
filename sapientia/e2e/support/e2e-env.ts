/**
 * Settings the Playwright config, the global setup and the journeys share. The journeys run against a database they empty
 * first, so it is never the development one: TEST_DATABASE_URL locally, or CI's throwaway DATABASE_URL.
 */
try {
  process.loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export const E2E_PORT = 3100;
export const E2E_ORIGIN = `http://localhost:${E2E_PORT}`;

/** Every seeded account in the emptied database gets this password. It protects nothing: the data is fictional and local. */
export const E2E_PASSWORD = 'e2e-only-password-7';

export const SCHOOL_TIME_ZONE = 'Asia/Kuala_Lumpur';

export const ACCOUNTS = {
  admin: { email: 'pentadbir@guru.sapientia.test', name: 'Encik Hafiz Rahman' },
  sender: { email: 'pk.pentadbiran@guru.sapientia.test', name: 'Puan Salmah Idris' },
  aminah: { email: 'cikgu.aminah@guru.sapientia.test', name: 'Cikgu Aminah Yusof' },
  ravi: { email: 'cikgu.ravi@guru.sapientia.test', name: 'Cikgu Ravi Shankar' },
  meiling: { email: 'cikgu.meiling@guru.sapientia.test', name: 'Cikgu Tan Mei Ling' },
} as const;

export function e2eDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL || (process.env.CI === 'true' ? process.env.DATABASE_URL : undefined);
  if (!url) throw new Error('Set TEST_DATABASE_URL in .env: the end-to-end journeys must not run against the development database.');
  return url;
}
