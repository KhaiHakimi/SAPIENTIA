import 'server-only';
import { hashPassword, timingDummyHash, verifyPassword } from '@/features/auth/server/password.service';
import { assertNotThrottled, clearAccountFailures, recordFailure } from '@/features/auth/server/throttle.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { InvalidCredentialsError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import type { ChangeStudentPasswordRequest, SessionStudent, StudentSignInRequest } from '../interfaces/student.interface';
import { revokeStudentSessions } from './students.repository';
import { createStudentSession } from './student-session.service';

/** Pupil sign-in and the pupil's own password. No sign-in time is stored: the school does not watch when a child signs in. */

interface CredentialRow {
  id: string;
  school_id: string;
  status: 'active' | 'disabled';
  password_hash: string;
  must_change_password: boolean;
  starting_password_expires_at: Date | null;
}

/** Pupils have their own throttle counters, apart from staff emails. */
const studentThrottleKey = (username: string) => `student:${username.trim().toLowerCase()}`;

/**
 * Checks the password and starts a pupil session. An unknown username, a wrong password, a disabled account and an expired
 * slip all give the same error after the same work, so the answer says nothing about which usernames exist.
 */
export async function signInStudent(
  input: StudentSignInRequest,
  address: string,
  clock: Clock,
  db: Queryable = getPool(),
): Promise<string> {
  const keys = { account: studentThrottleKey(input.username), address };
  await assertNotThrottled(db, keys, clock);

  const { rows } = await db.query<CredentialRow>(
    `SELECT id, school_id, status, password_hash, must_change_password, starting_password_expires_at FROM students WHERE username = $1`,
    [input.username],
  );
  const student = rows[0];
  const passwordOk = await verifyPassword(student?.password_hash ?? (await timingDummyHash()), input.password);
  const slipExpired = Boolean(student?.starting_password_expires_at && student.starting_password_expires_at <= clock.now());
  if (!student || !passwordOk || student.status !== 'active' || slipExpired) {
    await recordFailure(db, keys, clock);
    logger.info('student_auth.sign_in_failed', { studentId: student?.id ?? null });
    throw new InvalidCredentialsError();
  }

  await clearAccountFailures(db, keys.account);
  logger.info('student_auth.signed_in', { studentId: student.id, schoolId: student.school_id });
  return createStudentSession(db, student.school_id, student.id, clock);
}

/**
 * The pupil replaces their password (the slip's, the first time). A wrong current password counts towards the throttle like
 * a failed sign-in. Every other session ends, and the caller gets a fresh session token for this browser.
 */
export async function changeStudentPassword(
  student: SessionStudent,
  input: ChangeStudentPasswordRequest,
  address: string,
  clock: Clock,
): Promise<string> {
  const db = getPool();
  const keys = { account: studentThrottleKey(student.username), address };
  await assertNotThrottled(db, keys, clock);

  const { rows } = await db.query<{ password_hash: string }>('SELECT password_hash FROM students WHERE school_id = $1 AND id = $2', [
    student.schoolId,
    student.id,
  ]);
  const stored = rows[0]?.password_hash;
  if (!stored) throw new NotFoundError();
  if (!(await verifyPassword(stored, input.currentPassword))) {
    await recordFailure(db, keys, clock);
    throw new ValidationError({ currentPassword: 'wrong_password' });
  }
  if (input.newPassword === input.currentPassword) throw new ValidationError({ newPassword: 'same_password' });

  const hash = await hashPassword(input.newPassword);
  const token = await withTransaction(async (client) => {
    await client.query(
      `UPDATE students SET password_hash = $3, must_change_password = false, starting_password_expires_at = NULL, updated_at = $4
        WHERE school_id = $1 AND id = $2`,
      [student.schoolId, student.id, hash, clock.now()],
    );
    await revokeStudentSessions(client, student.schoolId, student.id);
    return createStudentSession(client, student.schoolId, student.id, clock);
  });
  await clearAccountFailures(db, keys.account);
  logger.info('student_auth.password_changed', { studentId: student.id, schoolId: student.schoolId });
  return token;
}
