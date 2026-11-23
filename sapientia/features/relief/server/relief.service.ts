import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { sumCommittedMinutes } from '@/features/capacity/server/capacity.repository';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { planDelivery } from '@/features/delivery/server/delivery-plan.service';
import { loadWorkingCalendar } from '@/features/delivery/server/school-calendar.repository';
import { isWorkingDay } from '@/features/delivery/services/working-time.service';
import { queueEventNotice } from '@/features/notifications/server/event-notice-queue.service';
import { SLOTS_PER_TEACHER_MAX } from '@/features/timetable/constants/timetable.constants';
import { listSlots } from '@/features/timetable/server/timetable.repository';
import type { StaffMember } from '@/features/users/interfaces/staff-user.interface';
import { listActiveStaff } from '@/features/users/server/users.repository';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, withTransaction, type Queryable } from '@/shared/server/database.service';
import { RELIEF_DUTIES_SHOWN_MAX } from '../constants/relief.constants';
import type { NewRelief, ReliefAssigned, ReliefDay, ReliefDuty, ReliefSuggestions } from '../interfaces/relief.interface';
import { busyTeacherIds, rankReliefCandidates } from '../services/relief-ranking.service';
import {
  countReliefBetween, deleteRelief, findSlotForRelief, insertRelief, listAbsentTeacherIds, listBusyPeriods, listDuties,
  listReliefForDay, listTeachingStaffIds, type SlotForRelief,
} from './relief.repository';

const UNIQUE_VIOLATION = '23505';
const EXCLUSION_VIOLATION = '23P01';

const localNow = (now: Date, calendar: WorkingCalendar) => DateTime.fromJSDate(now, { zone: calendar.timeZone });

/** Relief can be arranged for today or later, on a day the school works. */
function canArrangeOn(onDate: string, now: Date, calendar: WorkingCalendar): boolean {
  return onDate >= (localNow(now, calendar).toISODate() ?? '') && isWorkingDay(onDate, calendar);
}

/**
 * Why relief for a period on a date can no longer be arranged or cancelled: the date has passed, or it is today and the
 * period has ended. Once over, the relief is what happened, and the relief teacher's lesson record depends on it.
 */
function overReason(onDate: string, endTime: string, now: Date, timeZone: string): 'past_date' | 'period_over' | null {
  const local = DateTime.fromJSDate(now, { zone: timeZone });
  const today = local.toISODate() ?? '';
  if (onDate < today) return 'past_date';
  return onDate === today && endTime <= local.toFormat('HH:mm') ? 'period_over' : null;
}

/**
 * The period relief is wanted for, checked against the date: it must be that period's weekday, a working day, and not
 * already over. Each refusal names the field and the reason.
 */
async function loadPeriod(db: Queryable, schoolId: string, slotId: string, onDate: string, now: Date): Promise<SlotForRelief> {
  const slot = await findSlotForRelief(db, schoolId, slotId);
  if (!slot) throw new ValidationError({ slotId: 'invalid_slot' });
  const calendar = await loadWorkingCalendar(db, schoolId, now);
  if (DateTime.fromISO(onDate, { zone: calendar.timeZone }).weekday !== slot.weekday) throw new ValidationError({ onDate: 'wrong_weekday' });
  const over = overReason(onDate, slot.end_time, now, calendar.timeZone);
  if (over === 'past_date') throw new ValidationError({ onDate: 'past_date' });
  if (!isWorkingDay(onDate, calendar)) throw new ValidationError({ onDate: 'not_working_day' });
  if (over === 'period_over') throw new ValidationError({ onDate: 'period_over' });
  return slot;
}

/**
 * Active staff who could cover the period: not the absent teacher, not away themselves that day, and with no lesson, duty
 * or other relief that overlaps it.
 */
async function listFreeStaff(db: Queryable, schoolId: string, slot: SlotForRelief, onDate: string): Promise<StaffMember[]> {
  const periods = (await listBusyPeriods(db, schoolId, slot.weekday, onDate))
    .map((row) => ({ teacherId: row.teacher_id, start: row.start_time, end: row.end_time }));
  const busy = busyTeacherIds(periods, slot.start_time, slot.end_time);
  const away = new Set(await listAbsentTeacherIds(db, schoolId, onDate));
  const staff = await listActiveStaff(db, schoolId);
  return staff.filter((person) => person.id !== slot.teacher_id && !busy.has(person.id) && !away.has(person.id));
}

/** Administrators: one teacher's periods on a date, each with the relief arranged for it, if any. */
export async function getReliefDay(actor: SessionUser, teacherId: string, onDate: string, clock: Clock): Promise<ReliefDay> {
  const db = getPool();
  const now = clock.now();
  const [teacher] = await listActiveStaff(db, actor.schoolId, [teacherId]);
  if (!teacher) throw new NotFoundError();
  const calendar = await loadWorkingCalendar(db, actor.schoolId, now);
  const weekday = DateTime.fromISO(onDate, { zone: calendar.timeZone }).weekday;
  const slots = (await listSlots(db, actor.schoolId, teacherId, SLOTS_PER_TEACHER_MAX)).filter((slot) => slot.weekday === weekday);
  const cover = new Map((await listReliefForDay(db, actor.schoolId, teacherId, onDate)).map((row) => [row.slot_id, row]));
  return {
    teacher: { id: teacher.id, name: teacher.name },
    onDate,
    canArrange: canArrangeOn(onDate, now, calendar),
    periods: slots.map((slot) => {
      const relief = cover.get(slot.id);
      if (!relief) return { slot, relief: null };
      return {
        slot,
        relief: {
          id: relief.id,
          reliefTeacher: { id: relief.relief_teacher_id, name: relief.relief_teacher_name },
          deliverAt: relief.deliver_at.toISOString(),
          held: relief.deliver_at.getTime() > now.getTime(),
        },
      };
    }),
  };
}

/**
 * Up to three people to cover a period (plan Phase 2): free in the period, then fewest relief classes this month, then
 * least committed work this week. Only staff who teach are suggested. It suggests and a person decides; nothing is saved,
 * and nobody outside the top three is listed, so this cannot be read as a ranking of the staff.
 */
export async function suggestRelief(actor: SessionUser, slotId: string, onDate: string, clock: Clock): Promise<ReliefSuggestions> {
  const db = getPool();
  const slot = await loadPeriod(db, actor.schoolId, slotId, onDate, clock.now());
  const teaches = new Set(await listTeachingStaffIds(db, actor.schoolId));
  const free = (await listFreeStaff(db, actor.schoolId, slot, onDate)).filter((person) => teaches.has(person.id));
  if (free.length === 0) return { items: [] };

  const day = DateTime.fromISO(onDate);
  const reliefCounts = await countReliefBetween(db, actor.schoolId, day.startOf('month').toISODate() ?? '', day.endOf('month').toISODate() ?? '');
  const committed = new Map(
    (await sumCommittedMinutes(db, actor.schoolId, day.endOf('week').toISODate() ?? '')).map((row) => [row.user_id, row.minutes]),
  );
  return {
    items: rankReliefCandidates(free.map((person) => ({
      teacher: { id: person.id, name: person.name },
      reliefThisMonth: reliefCounts.get(person.id) ?? 0,
      committedMinutesThisWeek: committed.get(person.id) ?? 0,
    }))),
  };
}

/**
 * An administrator gives a period to a relief teacher, who must be free then. Held delivery applies (plan Phase 2): arranged
 * outside working hours, the relief teacher sees it at the next working start. The database refuses a second relief for the
 * same period and a relief teacher in two places at once, even if two administrators act together.
 */
export async function assignRelief(actor: SessionUser, input: NewRelief, clock: Clock): Promise<ReliefAssigned> {
  try {
    return await withTransaction(async (client) => {
      const now = clock.now();
      const slot = await loadPeriod(client, actor.schoolId, input.slotId, input.onDate, now);
      if (input.reliefTeacherId === slot.teacher_id) throw new ValidationError({ reliefTeacherId: 'same_teacher' });
      const free = await listFreeStaff(client, actor.schoolId, slot, input.onDate);
      if (!free.some((person) => person.id === input.reliefTeacherId)) throw new ValidationError({ reliefTeacherId: 'not_free' });

      const plan = await planDelivery(client, actor.schoolId, false, clock);
      const id = await insertRelief(client, actor.schoolId, {
        slot, onDate: input.onDate, reliefTeacherId: input.reliefTeacherId, deliverAt: plan.deliverAt, createdBy: actor.id, now,
      });
      await writeAudit(client, actor.schoolId, [{
        actorId: actor.id, action: 'relief.assigned', entityType: 'relief_assignment', entityId: id,
        metadata: { slotId: slot.id, onDate: input.onDate, absentTeacherId: slot.teacher_id, reliefTeacherId: input.reliefTeacherId },
      }]);
      // Told when the duty is delivered to them, by the same held-delivery time.
      await queueEventNotice(client, { kind: 'relief.assigned', schoolId: actor.schoolId, reliefId: id }, clock, plan.deliverAt);
      return { id, deliverAt: plan.deliverAt.toISOString(), held: plan.deliveredAt === null };
    });
  } catch (error) {
    const { code } = error as { code?: string };
    if (code === UNIQUE_VIOLATION) throw new ConflictError('This period already has a relief teacher.', { slotId: 'already_covered' });
    if (code === EXCLUSION_VIOLATION) throw new ConflictError('This teacher is covering another class then.', { reliefTeacherId: 'not_free' });
    throw error;
  }
}

/**
 * An administrator cancels a relief; the period is uncovered again and can be given to someone else. A relief teacher who
 * had already been told is told it is cancelled, at the next working moment. One still held never knew, so hears nothing.
 * Relief already over is refused (409): it happened, and cancelling it would hand the lesson record back to the absent
 * teacher.
 */
export async function cancelRelief(actor: SessionUser, reliefId: string, clock: Clock): Promise<void> {
  await withTransaction(async (client) => {
    const removed = await deleteRelief(client, actor.schoolId, reliefId);
    if (!removed) throw new NotFoundError();
    // Checked after the delete so the row is read once; throwing rolls the delete back.
    const over = overReason(removed.on_date, removed.end_time, clock.now(), actor.timeZone);
    if (over) throw new ConflictError('This relief is already over.', { onDate: over });
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'relief.cancelled', entityType: 'relief_assignment', entityId: reliefId,
      metadata: { slotId: removed.slot_id, onDate: removed.on_date, reliefTeacherId: removed.relief_teacher_id },
    }]);
    if (removed.deliver_at.getTime() <= clock.now().getTime()) {
      await queueEventNotice(client, {
        kind: 'relief.cancelled', schoolId: actor.schoolId, reliefId, reliefTeacherId: removed.relief_teacher_id,
        absentTeacherId: removed.absent_teacher_id, onDate: removed.on_date, startTime: removed.start_time, endTime: removed.end_time,
      }, clock);
    }
  });
}

/** The caller's own relief duties from today on. One still held is not shown until its delivery time. */
export async function listMyReliefDuties(actor: SessionUser, clock: Clock): Promise<ReliefDuty[]> {
  const now = clock.now();
  const today = DateTime.fromJSDate(now, { zone: actor.timeZone }).toISODate() ?? '';
  return listDuties(getPool(), actor.schoolId, actor.id, today, now, RELIEF_DUTIES_SHOWN_MAX);
}
