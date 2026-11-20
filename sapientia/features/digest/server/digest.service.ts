import 'server-only';
import { loadWorkingCalendar } from '@/features/delivery/server/school-calendar.repository';
import type { EmailSender } from '@/features/notifications/interfaces/notification.interface';
import { isTemporary } from '@/features/notifications/server/send-failure';
import { listDuties } from '@/features/relief/server/relief.repository';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { getPool, type Queryable } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import { DIGEST_LIST_MAX } from '../constants/digest.constants';
import type { DigestSweepResult, DigestTask, DigestWeek, WeeklyDigest } from '../interfaces/digest.interface';
import { buildDigestEmail, isDigestEmpty } from '../services/digest-content';
import { digestWeekDue } from '../services/digest-schedule.service';
import {
  countWaitingExtensions, type DigestRecipientRow, listDueRecipients, listOpenWork, listSchoolIds, recordDigest,
} from './digest.repository';

const WEEK_MS = 7 * 86_400_000;
/** Relief rows fetched per person before keeping this week's; a teacher with more relief than this in a week is unheard of. */
const RELIEF_FETCH_MAX = 50;

/**
 * The weekly digest (plan Phase 6), run by the worker every 15 minutes. For each school whose first working morning of the
 * week has come, every member of staff with the digest on gets one email of their own work: overdue, due this week, relief
 * classes, and requests waiting for their answer. A week with nothing to say sends nothing. Each person's week is recorded
 * once, so later sweeps skip them; a temporary email failure is left unrecorded and tried again by the next sweep, a
 * permanent one is recorded and not retried. No language model is involved and nothing leaves the school but the email.
 */
export async function sendWeeklyDigests(clock: Clock, email: EmailSender | null, appOrigin: string | null): Promise<DigestSweepResult> {
  const result: DigestSweepResult = { sent: 0, empty: 0, failed: 0, retry: 0 };
  if (!email) return result;
  const db = getPool();
  const now = clock.now();
  for (const schoolId of await listSchoolIds(db)) {
    // From a week back, so a holiday earlier this week is known when finding the first working day.
    const calendar = await loadWorkingCalendar(db, schoolId, new Date(now.getTime() - WEEK_MS));
    const week = digestWeekDue(now, calendar);
    if (!week) continue;
    for (const recipient of await listDueRecipients(db, schoolId, week.weekOf)) {
      const digest = await collectDigest(db, schoolId, recipient, week, now, appOrigin);
      if (isDigestEmpty(digest)) {
        await recordDigest(db, schoolId, recipient.id, week.weekOf, 'empty', now);
        result.empty++;
        continue;
      }
      try {
        await email.send(buildDigestEmail(digest, recipient.email));
        await recordDigest(db, schoolId, recipient.id, week.weekOf, 'sent', now);
        result.sent++;
      } catch (error) {
        if (isTemporary(error)) {
          result.retry++;
          continue;
        }
        logger.error('digest.send_failed', { schoolId, userId: recipient.id, error });
        await recordDigest(db, schoolId, recipient.id, week.weekOf, 'failed', now);
        result.failed++;
      }
    }
  }
  if (result.sent + result.empty + result.failed + result.retry > 0) logger.info('digest.sweep', { ...result });
  return result;
}

async function collectDigest(
  db: Queryable,
  schoolId: string,
  recipient: DigestRecipientRow,
  week: DigestWeek,
  now: Date,
  appOrigin: string | null,
): Promise<WeeklyDigest> {
  const work = await listOpenWork(db, schoolId, recipient.id, week.today, week.weekEndsOn, DIGEST_LIST_MAX);
  const toTask = (row: (typeof work)[number]): DigestTask => ({ taskId: row.id, title: row.title, dueOn: row.my_due_on });
  const overdue = work.filter((row) => row.overdue);
  const dueThisWeek = work.filter((row) => !row.overdue);
  // Only relief already delivered to the teacher (held relief stays unseen until its time).
  const relief = (await listDuties(db, schoolId, recipient.id, week.weekOf, now, RELIEF_FETCH_MAX))
    .filter((duty) => duty.onDate <= week.weekEndsOn)
    .map((duty) => ({ onDate: duty.onDate, startTime: duty.startTime, endTime: duty.endTime, className: duty.class?.name ?? null }));
  return {
    recipientName: recipient.name,
    week,
    overdue: overdue.map(toTask),
    dueThisWeek: dueThisWeek.map(toTask),
    overdueCount: overdue[0]?.total ?? 0,
    dueThisWeekCount: dueThisWeek[0]?.total ?? 0,
    relief,
    extensionsWaiting: await countWaitingExtensions(db, schoolId, recipient.id),
    boardLink: appOrigin ? `${appOrigin}/staff` : null,
  };
}
