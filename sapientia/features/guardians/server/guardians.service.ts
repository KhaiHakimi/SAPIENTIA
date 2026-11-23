import 'server-only';
import type { PoolClient } from 'pg';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { hashPassword } from '@/features/auth/server/password.service';
import { STARTING_PASSWORD_VALID_DAYS } from '@/features/students/constants/students.constants';
import { generateStartingPassword, generateUsername } from '@/features/students/server/student-credentials.service';
import { cancelOpenForGuardian, cancelOpenForLink } from '@/features/meetings/server/meetings.repository';
import { findStudent } from '@/features/students/server/students.repository';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import { decodeCursor, encodeCursor, toPage } from '@/shared/server/pagination';
import { GUARDIAN_LINKS_MAX, GUARDIAN_USERNAME_FALLBACK_STEM, GUARDIAN_USERNAME_PREFIX } from '../constants/guardians.constants';
import type {
  AddGuardianRequest,
  AddGuardianResult,
  AddLinkRequest,
  GuardianSlip,
  LinkRemovalReason,
  SchoolGuardian,
  UpdateGuardianRequest,
} from '../interfaces/guardian.interface';
import {
  countActiveLinks,
  deleteGuardian,
  endLink,
  findGuardian,
  insertGuardian,
  insertLink,
  listGuardians,
  listLinks,
  lockGuardian,
  revokeGuardianSessions,
  setGuardianStartingPassword,
  toSchoolGuardian,
  updateGuardianDetails,
} from './guardians.repository';

/**
 * Administrators manage guardians and their links (plan Phase 4, Sprint 13). Links are made here only, never claimed by a
 * guardian. Callers have already checked the role. Audit entries carry ids, relationship types and reason codes only.
 */

const DAY_MS = 86_400_000;
const USERNAME_ATTEMPTS = 8;

export async function listSchoolGuardians(actor: SessionUser, limit: number, cursor: string | undefined): Promise<Page<SchoolGuardian>> {
  const db = getPool();
  const after = decodeCursor(cursor);
  const rows = await listGuardians(db, actor.schoolId, limit, after && { name: after.sortValue, id: after.id });
  const links = await listLinks(db, actor.schoolId, rows.slice(0, limit).map((row) => row.id));
  return toPage(rows, limit, (row) => toSchoolGuardian(row, links), (row) => encodeCursor(row.name, row.id));
}

/** Adds a guardian with their first link and returns their slip; the starting password is in this response only. */
export async function addGuardian(actor: SessionUser, input: AddGuardianRequest, clock: Clock): Promise<AddGuardianResult> {
  const password = generateStartingPassword();
  const hash = await hashPassword(password);
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + STARTING_PASSWORD_VALID_DAYS * DAY_MS);

  const result = await withTransaction(async (client) => {
    const child = await findStudent(client, actor.schoolId, input.studentId);
    if (!child) throw new ValidationError({ studentId: 'invalid_student' });
    const { id, username } = await insertWithFreeUsername(client, actor.schoolId, input.name, hash, expiresAt, now);
    const linkId = await insertLink(client, actor.schoolId, {
      guardianId: id, studentId: input.studentId, relationship: input.relationship, createdBy: actor.id, now,
    });
    await writeAudit(client, actor.schoolId, [
      { actorId: actor.id, action: 'guardian.added', entityType: 'guardian', entityId: id },
      {
        actorId: actor.id, action: 'guardian.link_added', entityType: 'guardian', entityId: id,
        metadata: { linkId, studentId: input.studentId, relationship: input.relationship },
      },
    ]);
    const guardian = await loadGuardian(client, actor.schoolId, id);
    const slip: GuardianSlip = {
      guardianId: id, name: input.name, children: [child.name], username, startingPassword: password, expiresAt: expiresAt.toISOString(),
    };
    return { guardian, slip };
  });
  logger.info('guardians.added', { schoolId: actor.schoolId, actorId: actor.id, guardianId: result.guardian.id });
  return result;
}

/**
 * Changes a guardian's name or status. Disabling signs them out everywhere and ends their open meeting requests: they can no
 * longer see or withdraw them, so a teacher would otherwise answer, or wait for, someone who cannot come.
 */
export async function updateGuardian(actor: SessionUser, id: string, input: UpdateGuardianRequest, clock: Clock): Promise<SchoolGuardian> {
  return withTransaction(async (client) => {
    const before = await findGuardian(client, actor.schoolId, id);
    if (!before) throw new NotFoundError();
    await updateGuardianDetails(client, actor.schoolId, id, input, clock.now());
    let meetingsCancelled = 0;
    if (input.status === 'disabled') {
      await revokeGuardianSessions(client, actor.schoolId, id);
      meetingsCancelled = await cancelOpenForGuardian(client, actor.schoolId, id, clock.now());
    }
    const after = await loadGuardian(client, actor.schoolId, id);
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'guardian.updated', entityType: 'guardian', entityId: id,
      metadata: {
        nameChanged: after.name !== before.name, status: after.status !== before.status ? after.status : null, meetingsCancelled,
      },
    }]);
    return after;
  });
}

/** A new slip for a guardian who forgot their password: the old one stops working and every session ends. */
export async function resetGuardianPassword(actor: SessionUser, id: string, clock: Clock): Promise<GuardianSlip> {
  const password = generateStartingPassword();
  const hash = await hashPassword(password);
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + STARTING_PASSWORD_VALID_DAYS * DAY_MS);
  return withTransaction(async (client) => {
    const guardian = await findGuardian(client, actor.schoolId, id);
    if (!guardian) throw new NotFoundError();
    await setGuardianStartingPassword(client, actor.schoolId, id, hash, expiresAt, now);
    await revokeGuardianSessions(client, actor.schoolId, id);
    await writeAudit(client, actor.schoolId, [{ actorId: actor.id, action: 'guardian.password_reset', entityType: 'guardian', entityId: id }]);
    const { links } = await loadGuardian(client, actor.schoolId, id);
    return {
      guardianId: id, name: guardian.name, children: links.filter((link) => link.status === 'active').map((link) => link.student.name),
      username: guardian.username, startingPassword: password, expiresAt: expiresAt.toISOString(),
    };
  });
}

/** Removes a guardian, with their links and sessions. The audit entry keeps only the id. */
export async function removeGuardian(actor: SessionUser, id: string): Promise<void> {
  await withTransaction(async (client) => {
    if (!(await deleteGuardian(client, actor.schoolId, id))) throw new NotFoundError();
    await writeAudit(client, actor.schoolId, [{ actorId: actor.id, action: 'guardian.removed', entityType: 'guardian', entityId: id }]);
  });
}

/** Links a guardian to another child. Refused when already linked to them, or at GUARDIAN_LINKS_MAX children. */
export async function addLink(actor: SessionUser, guardianId: string, input: AddLinkRequest, clock: Clock): Promise<SchoolGuardian> {
  return withTransaction(async (client) => {
    if (!(await findGuardian(client, actor.schoolId, guardianId))) throw new NotFoundError();
    if (!(await findStudent(client, actor.schoolId, input.studentId))) throw new ValidationError({ studentId: 'invalid_student' });
    // Links are counted and added one at a time per guardian, so two administrators cannot both add the eleventh.
    await lockGuardian(client, actor.schoolId, guardianId);
    if ((await countActiveLinks(client, actor.schoolId, guardianId)) >= GUARDIAN_LINKS_MAX) {
      throw new ValidationError({ studentId: 'too_many_children' });
    }
    const linkId = await insertLink(client, actor.schoolId, {
      guardianId, studentId: input.studentId, relationship: input.relationship, createdBy: actor.id, now: clock.now(),
    });
    if (!linkId) throw new ConflictError('This guardian is already linked to this pupil.', { studentId: 'already_linked' });
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'guardian.link_added', entityType: 'guardian', entityId: guardianId,
      metadata: { linkId, studentId: input.studentId, relationship: input.relationship },
    }]);
    return loadGuardian(client, actor.schoolId, guardianId);
  });
}

/**
 * Removes an active link with a reason code. The guardian stops seeing that child at once; meeting requests still waiting,
 * and accepted ones still to come, end.
 */
export async function removeLink(
  actor: SessionUser,
  target: { guardianId: string; linkId: string },
  reason: LinkRemovalReason,
  clock: Clock,
): Promise<SchoolGuardian> {
  return withTransaction(async (client) => {
    if (!(await endLink(client, actor.schoolId, target, { status: 'removed', reason, now: clock.now() }))) throw new NotFoundError();
    const meetingsCancelled = await cancelOpenForLink(client, actor.schoolId, target.linkId, clock.now());
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'guardian.link_removed', entityType: 'guardian', entityId: target.guardianId,
      metadata: { linkId: target.linkId, reason, meetingsCancelled },
    }]);
    return loadGuardian(client, actor.schoolId, target.guardianId);
  });
}

async function loadGuardian(client: PoolClient, schoolId: string, id: string): Promise<SchoolGuardian> {
  const row = await findGuardian(client, schoolId, id);
  if (!row) throw new NotFoundError();
  return toSchoolGuardian(row, await listLinks(client, schoolId, [id]));
}

async function insertWithFreeUsername(
  client: PoolClient,
  schoolId: string,
  name: string,
  passwordHash: string,
  expiresAt: Date,
  now: Date,
): Promise<{ id: string; username: string }> {
  for (let attempt = 0; attempt < USERNAME_ATTEMPTS; attempt += 1) {
    const username = `${GUARDIAN_USERNAME_PREFIX}${generateUsername(name, undefined, GUARDIAN_USERNAME_FALLBACK_STEM)}`;
    const id = await insertGuardian(client, schoolId, { name, username, passwordHash, startingPasswordExpiresAt: expiresAt, now });
    if (id) return { id, username };
  }
  throw new Error('No free username after several attempts.');
}
