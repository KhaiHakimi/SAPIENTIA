/**
 * Development seed: two fictional schools and their staff. Every name is invented and every address uses the reserved .test
 * domain, so nothing can reach a real person. Safe to run again: it updates the same rows.
 *
 * The shared password comes from SEED_PASSWORD in .env, never from this file. Run with `npm run db:seed`.
 */
import { hashPassword } from '@/features/auth/server/password.service';
import { closePool, withTransaction } from '@/shared/server/database.service';
import { PASSWORD_MIN_LENGTH } from '@/features/auth/constants/password.constants';

interface SeedUser {
  email: string;
  name: string;
  role: 'admin' | 'sender' | 'teacher';
}

interface SeedSchool {
  code: string;
  name: string;
  users: SeedUser[];
}

const SEED_SCHOOLS: SeedSchool[] = [
  {
    code: 'DEMO001',
    name: 'SMK Taman Contoh',
    users: [
      { email: 'pentadbir@guru.sapientia.test', name: 'Encik Hafiz Rahman', role: 'admin' },
      { email: 'pk.pentadbiran@guru.sapientia.test', name: 'Puan Salmah Idris', role: 'sender' },
      { email: 'cikgu.aminah@guru.sapientia.test', name: 'Cikgu Aminah Yusof', role: 'teacher' },
      { email: 'cikgu.ravi@guru.sapientia.test', name: 'Cikgu Ravi Shankar', role: 'teacher' },
      { email: 'cikgu.meiling@guru.sapientia.test', name: 'Cikgu Tan Mei Ling', role: 'teacher' },
    ],
  },
  {
    code: 'DEMO002',
    name: 'SMK Bukit Contoh',
    users: [
      { email: 'pentadbir@bukit.sapientia.test', name: 'Puan Norliza Hamid', role: 'admin' },
      { email: 'cikgu.farid@bukit.sapientia.test', name: 'Cikgu Farid Osman', role: 'teacher' },
    ],
  },
];

async function main(): Promise<void> {
  const password = process.env.SEED_PASSWORD ?? '';
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Set SEED_PASSWORD in .env (at least ${PASSWORD_MIN_LENGTH} characters) before seeding.`);
  }
  const passwordHash = await hashPassword(password);

  await withTransaction(async (client) => {
    for (const school of SEED_SCHOOLS) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO schools (code, name) VALUES ($1, $2)
         ON CONFLICT (lower(code)) DO UPDATE SET name = EXCLUDED.name, updated_at = now() RETURNING id`,
        [school.code, school.name],
      );
      const schoolId = rows[0].id;
      for (const user of school.users) {
        await client.query(
          `INSERT INTO users (school_id, email, name, role, status, password_hash) VALUES ($1, $2, $3, $4, 'active', $5)
           ON CONFLICT (lower(email)) DO UPDATE
             SET name = EXCLUDED.name, role = EXCLUDED.role, status = 'active', password_hash = EXCLUDED.password_hash, updated_at = now()`,
          [schoolId, user.email, user.name, user.role, passwordHash],
        );
      }
    }
  });
  const count = SEED_SCHOOLS.reduce((total, school) => total + school.users.length, 0);
  console.log(`Seeded ${SEED_SCHOOLS.length} schools and ${count} staff accounts.`);
}

main()
  .catch((error: unknown) => {
    console.error('Seeding failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closePool);
