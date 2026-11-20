import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import { HOMEWORK_LIST_MAX, PUPIL_HOMEWORK_DAYS_BACK } from '@/features/homework/constants/homework.constants';
import { listPupilHomework } from '@/features/homework/server/homework.repository';
import { cancelPendingForLink } from '@/features/meetings/server/meetings.repository';
import type { ClassWeek } from '@/features/timetable/interfaces/timetable.interface';
import { getClassWeek } from '@/features/timetable/server/class-week.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { NotFoundError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import type { GuardianChild, GuardianChildren, LinkRefusalReason, SessionGuardian } from '../interfaces/guardian.interface';
import { endLink, findChild, listChildren } from './guardians.repository';

/**
 * What a guardian sees (plan Phase 4, Sprint 13): read only, and only through their own active links. A child is named by
 * the link's id; another guardian's link, or one that has ended, is 404.
 */

/**
 * Each linked child with their class's homework from a week ago and whether this child's hand-in is recorded. One homework
 * query per child: a guardian has at most GUARDIAN_LINKS_MAX children, so this stays small.
 */
export async function listGuardianChildren(guardian: SessionGuardian, clock: Clock): Promise<GuardianChildren> {
  const db = getPool();
  const fromDate = DateTime.fromJSDate(clock.now(), { zone: guardian.timeZone }).minus({ days: PUPIL_HOMEWORK_DAYS_BACK }).toISODate() ?? '';
  const rows = await listChildren(db, guardian.schoolId, guardian.id);
  const children: GuardianChild[] = [];
  for (const row of rows) {
    const homework = row.class_id
      ? await listPupilHomework(db, guardian.schoolId, { studentId: row.student_id, classId: row.class_id }, fromDate, HOMEWORK_LIST_MAX)
      : [];
    children.push({ linkId: row.link_id, name: row.name, className: row.class_name, relationship: row.relationship, homework });
  }
  return { children };
}

/** One linked child's class timetable for a week, relief marked. */
export async function getChildWeek(
  guardian: SessionGuardian,
  linkId: string,
  weekOf: string | undefined,
  clock: Clock,
): Promise<ClassWeek> {
  const child = await findChild(getPool(), guardian.schoolId, guardian.id, linkId);
  if (!child) throw new NotFoundError();
  return getClassWeek({ schoolId: guardian.schoolId, timeZone: guardian.timeZone, classId: child.class_id }, weekOf, clock);
}

/**
 * The guardian refuses one of their links with a reason code. The child leaves their view at once and any meeting request
 * still waiting is cancelled; it cannot be undone here.
 */
export async function refuseLink(guardian: SessionGuardian, linkId: string, reason: LinkRefusalReason, clock: Clock): Promise<void> {
  await withTransaction(async (client) => {
    const ended = await endLink(client, guardian.schoolId, { guardianId: guardian.id, linkId }, { status: 'refused', reason, now: clock.now() });
    if (!ended) throw new NotFoundError();
    const meetingsCancelled = await cancelPendingForLink(client, guardian.schoolId, linkId, clock.now());
    await writeAudit(client, guardian.schoolId, [{
      actorId: guardian.id, action: 'guardian.link_refused', entityType: 'guardian', entityId: guardian.id,
      metadata: { linkId, reason, meetingsCancelled, actorKind: 'guardian' },
    }]);
  });
  logger.info('guardians.link_refused', { schoolId: guardian.schoolId, guardianId: guardian.id, linkId });
}
