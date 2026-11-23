import 'server-only';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { hashPassword } from '@/features/auth/server/password.service';
import { cancelOpenOutsideClass } from '@/features/meetings/server/meetings.repository';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import { decodeCursor, encodeCursor, toPage } from '@/shared/server/pagination';
import type { PoolClient } from 'pg';
import { STARTING_PASSWORD_VALID_DAYS } from '../constants/students.constants';
import type {
  AddStudentsRequest,
  AddStudentsResult,
  SchoolStudent,
  StudentSlip,
  UpdateStudentRequest,
} from '../interfaces/student.interface';
import { generateStartingPassword, generateUsername } from './student-credentials.service';
import {
  deleteStudent,
  enrolStudent,
  findClassName,
  findStudent,
  insertStudent,
  listStudents,
  revokeStudentSessions,
  setStartingPassword,
  takenSchoolNumbers,
  toSchoolStudent,
  updateStudentDetails,
} from './students.repository';

/**
 * Administrators manage the school's pupils (plan Phase 4, Sprint 11). Callers have already checked the role. Audit entries
 * carry ids and states only, never a pupil's name or number.
 */

const DAY_MS = 86_400_000;
/** Attempts at a free username before giving up; with four random digits a clash is rare. */
const USERNAME_ATTEMPTS = 8;

export async function listSchoolStudents(
  actor: SessionUser,
  classId: string | null,
  limit: number,
  cursor: string | undefined,
): Promise<Page<SchoolStudent>> {
  const after = decodeCursor(cursor);
  const rows = await listStudents(getPool(), actor.schoolId, classId, limit, after && { name: after.sortValue, id: after.id });
  return toPage(rows, limit, toSchoolStudent, (row) => encodeCursor(row.name, row.id));
}

/**
 * Adds a class's pupils at once, all or nothing, and returns a slip for each with a starting password that is shown only in
 * this response. A school number used twice in the list, or already used in the school, is reported against its line.
 */
export async function addStudents(actor: SessionUser, input: AddStudentsRequest, clock: Clock): Promise<AddStudentsResult> {
  const numbers = input.students.map((row) => row.schoolNumber ?? null);
  await assertNumbersFree(actor.schoolId, numbers);

  // Hashing is slow on purpose, so it happens before the transaction opens, one at a time to keep memory bounded.
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + STARTING_PASSWORD_VALID_DAYS * DAY_MS);
  const prepared: { name: string; schoolNumber: string | null; password: string; hash: string }[] = [];
  for (const row of input.students) {
    const password = generateStartingPassword();
    prepared.push({ name: row.name, schoolNumber: row.schoolNumber ?? null, password, hash: await hashPassword(password) });
  }

  const result = await withTransaction(async (client) => {
    const className = await findClassName(client, actor.schoolId, input.classId);
    if (!className) throw new ValidationError({ classId: 'invalid_class' });
    const students: SchoolStudent[] = [];
    const slips: StudentSlip[] = [];
    for (const pupil of prepared) {
      const { id, username } = await insertWithFreeUsername(client, actor.schoolId, pupil, expiresAt, now);
      await enrolStudent(client, actor.schoolId, id, input.classId, now);
      students.push({
        id, name: pupil.name, schoolNumber: pupil.schoolNumber, classId: input.classId, className, username,
        status: 'active', hasOwnPassword: false,
      });
      slips.push({
        studentId: id, name: pupil.name, className, username, startingPassword: pupil.password, expiresAt: expiresAt.toISOString(),
      });
    }
    await writeAudit(client, actor.schoolId, students.map((student) => ({
      actorId: actor.id, action: 'student.added' as const, entityType: 'student' as const, entityId: student.id,
      metadata: { classId: input.classId },
    })));
    return { students, slips };
  });
  logger.info('students.added', { schoolId: actor.schoolId, actorId: actor.id, count: result.students.length });
  return result;
}

/** Changes a pupil's name, number, class or status. Disabling signs the pupil out everywhere. */
export async function updateStudent(actor: SessionUser, id: string, input: UpdateStudentRequest, clock: Clock): Promise<SchoolStudent> {
  if (input.schoolNumber) await assertNumbersFree(actor.schoolId, [input.schoolNumber], id);
  const now = clock.now();
  return withTransaction(async (client) => {
    const before = await findStudent(client, actor.schoolId, id);
    if (!before) throw new NotFoundError();
    if (input.classId && !(await findClassName(client, actor.schoolId, input.classId))) {
      throw new ValidationError({ classId: 'invalid_class' });
    }
    await updateStudentDetails(client, actor.schoolId, id, input, now);
    let meetingsCancelled = 0;
    if (input.classId && input.classId !== before.class_id) {
      await enrolStudent(client, actor.schoolId, id, input.classId, now);
      // Requests to the old class's teachers end with the move; the guardian can ask the new class's teachers instead.
      meetingsCancelled = await cancelOpenOutsideClass(client, actor.schoolId, { studentId: id, classId: input.classId }, now);
    }
    if (input.status === 'disabled') await revokeStudentSessions(client, actor.schoolId, id);

    const after = await findStudent(client, actor.schoolId, id);
    if (!after) throw new NotFoundError();
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'student.updated', entityType: 'student', entityId: id,
      metadata: {
        nameChanged: after.name !== before.name,
        numberChanged: after.school_number !== before.school_number,
        classId: after.class_id !== before.class_id ? after.class_id : null,
        status: after.status !== before.status ? after.status : null,
        meetingsCancelled,
      },
    }]);
    return toSchoolStudent(after);
  });
}

/** A new slip for a pupil who forgot their password: the old one stops working and every session ends. */
export async function resetStudentPassword(actor: SessionUser, id: string, clock: Clock): Promise<StudentSlip> {
  const password = generateStartingPassword();
  const hash = await hashPassword(password);
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + STARTING_PASSWORD_VALID_DAYS * DAY_MS);
  return withTransaction(async (client) => {
    const student = await findStudent(client, actor.schoolId, id);
    if (!student) throw new NotFoundError();
    await setStartingPassword(client, actor.schoolId, id, hash, expiresAt, now);
    await revokeStudentSessions(client, actor.schoolId, id);
    await writeAudit(client, actor.schoolId, [{ actorId: actor.id, action: 'student.password_reset', entityType: 'student', entityId: id }]);
    return {
      studentId: id, name: student.name, className: student.class_name, username: student.username, startingPassword: password,
      expiresAt: expiresAt.toISOString(),
    };
  });
}

/** Removes a pupil who has left: the record, the class place and the sessions. The audit entry keeps only the id. */
export async function removeStudent(actor: SessionUser, id: string): Promise<void> {
  await withTransaction(async (client) => {
    if (!(await deleteStudent(client, actor.schoolId, id))) throw new NotFoundError();
    await writeAudit(client, actor.schoolId, [{ actorId: actor.id, action: 'student.removed', entityType: 'student', entityId: id }]);
  });
}

/**
 * Refuses school numbers used twice in the request or already held by another pupil of the school, naming each line. The
 * unique index still guards a race between two requests.
 */
async function assertNumbersFree(schoolId: string, numbers: readonly (string | null)[], exceptId: string | null = null): Promise<void> {
  const given = numbers.filter((number): number is string => Boolean(number));
  const taken = await takenSchoolNumbers(getPool(), schoolId, given, exceptId);
  const seen = new Set<string>();
  const fields: Record<string, string> = {};
  numbers.forEach((number, index) => {
    if (!number) return;
    const key = number.toLowerCase();
    const field = exceptId ? 'schoolNumber' : `students.${index}.schoolNumber`;
    if (taken.has(key)) fields[field] = 'number_taken';
    else if (seen.has(key)) fields[field] = 'number_repeated';
    seen.add(key);
  });
  if (Object.keys(fields).length > 0) throw new ConflictError('A school number is already used.', fields);
}

async function insertWithFreeUsername(
  client: PoolClient,
  schoolId: string,
  pupil: { name: string; schoolNumber: string | null; hash: string },
  expiresAt: Date,
  now: Date,
): Promise<{ id: string; username: string }> {
  for (let attempt = 0; attempt < USERNAME_ATTEMPTS; attempt += 1) {
    const username = generateUsername(pupil.name);
    const id = await insertStudent(client, schoolId, {
      name: pupil.name, schoolNumber: pupil.schoolNumber, username, passwordHash: pupil.hash, startingPasswordExpiresAt: expiresAt, now,
    });
    if (id) return { id, username };
  }
  throw new Error('No free username after several attempts.');
}
