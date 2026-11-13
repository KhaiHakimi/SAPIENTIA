import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import { HOURS_DAYS_BACK, HOURS_ENTRIES_SHOWN_MAX } from '../constants/hours.constants';
import type { HoursEntry, HoursMonth, HoursShare, NewHoursEntry, SharedHoursTotal } from '../interfaces/hours.interface';
import {
  deleteOwnEntry, deleteOwnShare, findOwnShare, insertOwnEntry, listOwnEntries, listSchoolShares, sumOwnMinutes, upsertOwnShare,
} from './hours.repository';

/**
 * The private hours log (plan Phase 3). Every function here acts on the caller's own log only: the owner is always
 * actor.id from the session. There is no function that takes another person's id. Entries are not written to the audit
 * log, because the audit log is not private to the teacher. The one exception, listSharedTotals, returns only the totals
 * people chose to share, and only to administrators.
 */

/** "2026-11" → the first and last day of that month. */
function monthRange(month: string): { from: string; to: string } {
  const start = DateTime.fromISO(`${month}-01`);
  return { from: start.toISODate() ?? '', to: start.endOf('month').toISODate() ?? '' };
}

export async function getHoursMonth(actor: SessionUser, month: string): Promise<HoursMonth> {
  const db = getPool();
  const range = monthRange(month);
  const [entries, totalMinutes, share] = await Promise.all([
    listOwnEntries(db, actor.schoolId, actor.id, range, HOURS_ENTRIES_SHOWN_MAX),
    sumOwnMinutes(db, actor.schoolId, actor.id, range),
    findOwnShare(db, actor.schoolId, actor.id, range.from),
  ]);
  return { month, entries, totalMinutes, share };
}

/** Adds an entry dated today or earlier, up to a year back, in the school's calendar. */
export async function addHoursEntry(actor: SessionUser, input: NewHoursEntry, clock: Clock): Promise<HoursEntry> {
  const now = clock.now();
  const today = DateTime.fromJSDate(now, { zone: actor.timeZone });
  if (input.onDate > (today.toISODate() ?? '')) throw new ValidationError({ onDate: 'future_date' });
  if (input.onDate < (today.minus({ days: HOURS_DAYS_BACK }).toISODate() ?? '')) throw new ValidationError({ onDate: 'too_old' });
  return insertOwnEntry(getPool(), actor.schoolId, actor.id, { ...input, note: input.note ?? null, now });
}

/** Deletes one of the caller's entries; anyone else's, or one that does not exist, is 404. */
export async function deleteHoursEntry(actor: SessionUser, entryId: string): Promise<void> {
  if (!(await deleteOwnEntry(getPool(), actor.schoolId, actor.id, entryId))) throw new NotFoundError();
}

/**
 * Shares the month's total as it is now: only the total, never an entry. Sharing again replaces the figure. A month that
 * has not started cannot be shared. The audit log records that a month was shared, not the figure.
 */
export async function shareHoursMonth(actor: SessionUser, month: string, clock: Clock): Promise<HoursShare> {
  const now = clock.now();
  const thisMonth = DateTime.fromJSDate(now, { zone: actor.timeZone }).toFormat('yyyy-MM');
  if (month > thisMonth) throw new ValidationError({ month: 'future_month' });
  return withTransaction(async (client) => {
    const range = monthRange(month);
    const minutes = await sumOwnMinutes(client, actor.schoolId, actor.id, range);
    await upsertOwnShare(client, actor.schoolId, actor.id, { month: range.from, minutes, now });
    await writeAudit(client, actor.schoolId, [
      { actorId: actor.id, action: 'hours.shared', entityType: 'user', entityId: actor.id, metadata: { month } },
    ]);
    return { minutes, sharedAt: now.toISOString() };
  });
}

/** Withdraws a shared total. Withdrawing one that is not shared changes nothing. */
export async function unshareHoursMonth(actor: SessionUser, month: string): Promise<void> {
  await withTransaction(async (client) => {
    if (!(await deleteOwnShare(client, actor.schoolId, actor.id, monthRange(month).from))) return;
    await writeAudit(client, actor.schoolId, [
      { actorId: actor.id, action: 'hours.unshared', entityType: 'user', entityId: actor.id, metadata: { month } },
    ]);
  });
}

/**
 * The monthly totals staff chose to share, for the monthly report: names and figures, never an entry. Administrators only;
 * the report route checks the role as well. month is YYYY-MM.
 */
export async function listSharedTotals(actor: SessionUser, month: string, db: Queryable = getPool()): Promise<SharedHoursTotal[]> {
  if (actor.role !== 'admin') throw new NotFoundError();
  return listSchoolShares(db, actor.schoolId, monthRange(month).from);
}
