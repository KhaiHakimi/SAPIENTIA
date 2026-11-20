import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { HOMEWORK_LIST_MAX } from '@/features/homework/constants/homework.constants';
import { listClassHomework } from '@/features/homework/server/homework.repository';
import { getClassWeek } from '@/features/timetable/server/class-week.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { NotFoundError } from '@/shared/server/app-errors';
import { getPool } from '@/shared/server/database.service';
import { SUMMARY_HOMEWORK_DAYS_AHEAD } from '../constants/guardians.constants';
import type { GuardianSummary, GuardianSummaryChild } from '../interfaces/guardian.interface';
import { findGuardian, listChildren } from './guardians.repository';

/**
 * The printed summary for a guardian without a smartphone (plan Phase 4, Sprint 13 part 2). An administrator prints it and
 * hands it over, like a slip. It carries each actively linked child's class homework due in the next two weeks and one
 * week's timetable; never hand-ins, which stay with the teacher who set the work. Each view is audited (ids only), because
 * it puts children's school days on paper.
 */
export async function getGuardianSummary(
  actor: SessionUser,
  guardianId: string,
  weekOf: string | undefined,
  clock: Clock,
): Promise<GuardianSummary> {
  const db = getPool();
  const guardian = await findGuardian(db, actor.schoolId, guardianId);
  if (!guardian) throw new NotFoundError();

  const today = DateTime.fromJSDate(clock.now(), { zone: actor.timeZone });
  const homeworkFrom = today.toISODate() ?? '';
  const homeworkTo = today.plus({ days: SUMMARY_HOMEWORK_DAYS_AHEAD }).toISODate() ?? '';
  const rows = await listChildren(db, actor.schoolId, guardianId);

  // At most GUARDIAN_LINKS_MAX children, so two small queries each stay cheap.
  const children: GuardianSummaryChild[] = [];
  for (const row of rows) {
    const homework = row.class_id
      ? await listClassHomework(db, actor.schoolId, row.class_id, { fromDate: homeworkFrom, toDate: homeworkTo }, HOMEWORK_LIST_MAX)
      : [];
    const week = await getClassWeek({ schoolId: actor.schoolId, timeZone: actor.timeZone, classId: row.class_id }, weekOf, clock);
    children.push({ name: row.name, className: row.class_name, homework, week });
  }

  await writeAudit(db, actor.schoolId, [{
    actorId: actor.id, action: 'guardian.summary_viewed', entityType: 'guardian', entityId: guardianId,
    metadata: { children: rows.length, weekOf: weekOf ?? null },
  }]);

  return {
    guardianName: guardian.name,
    schoolName: actor.schoolName,
    timeZone: actor.timeZone,
    generatedAt: clock.now().toISOString(),
    homeworkFrom,
    homeworkTo,
    children,
  };
}
