import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { listActiveStaff } from '@/features/users/server/users.repository';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { SLOTS_PER_TEACHER_MAX } from '../constants/timetable.constants';
import type { NewTimetableSlot, Timetable, TimetableSlot } from '../interfaces/timetable.interface';
import {
  countSlots, deleteSlot, hasReliefDutyClash, hasReliefToCome, insertSlot, listSlots, lockSlot, lockTeacherTimetable,
} from './timetable.repository';

const EXCLUSION_VIOLATION = '23P01';
const FOREIGN_KEY_VIOLATION = '23503';

/**
 * A teacher's week. Everyone may read their own; only an administrator may read a colleague's, and anyone else asking gets
 * 404, so the timetable never becomes a way to look up where a colleague is.
 */
export async function getTimetable(actor: SessionUser, teacherId: string | undefined): Promise<Timetable> {
  const targetId = teacherId ?? actor.id;
  if (targetId !== actor.id && actor.role !== 'admin') throw new NotFoundError();
  const [teacher] = await listActiveStaff(getPool(), actor.schoolId, [targetId]);
  if (!teacher) throw new NotFoundError();
  return {
    teacher: { id: teacher.id, name: teacher.name },
    slots: await listSlots(getPool(), actor.schoolId, targetId, SLOTS_PER_TEACHER_MAX),
  };
}

/** Today's date and the time of day at the school, against which relief counts as over or still to come. */
function schoolNow(clock: Clock, timeZone: string) {
  const local = DateTime.fromJSDate(clock.now(), { zone: timeZone });
  return { today: local.toISODate() ?? '', time: local.toFormat('HH:mm') };
}

/** A clash or a class from elsewhere is the database's to refuse (it holds even if two requests race); name the field. */
function slotError(error: unknown): unknown {
  const { code, constraint = '' } = error as { code?: string; constraint?: string };
  if (code === EXCLUSION_VIOLATION) return new ConflictError('This overlaps another period for the same teacher.', { startTime: 'overlaps' });
  if (code === FOREIGN_KEY_VIOLATION && constraint.includes('class')) return new ValidationError({ classId: 'invalid_class' });
  if (code === FOREIGN_KEY_VIOLATION && constraint.includes('subject')) return new ValidationError({ subjectId: 'invalid_subject' });
  return error;
}

/**
 * Administrators add a weekly period for an active member of staff in their school. A period that would clash with relief
 * the teacher already covers, from now on, is refused (409): they cannot be in two classes at once.
 */
export async function addTimetableSlot(actor: SessionUser, input: NewTimetableSlot, clock: Clock): Promise<TimetableSlot> {
  try {
    return await withTransaction(async (client) => {
      const [teacher] = await listActiveStaff(client, actor.schoolId, [input.teacherId]);
      if (!teacher) throw new ValidationError({ teacherId: 'invalid_teacher' });
      await lockTeacherTimetable(client, actor.schoolId, input.teacherId);
      if ((await countSlots(client, actor.schoolId, input.teacherId)) >= SLOTS_PER_TEACHER_MAX) throw new ValidationError({ teacherId: 'too_many' });
      const { today, time } = schoolNow(clock, actor.timeZone);
      if (await hasReliefDutyClash(client, actor.schoolId, input, today, time)) {
        throw new ConflictError('This overlaps a relief class the teacher covers.', { startTime: 'relief_clash' });
      }
      // Dated by the clock, as the lesson records and the monthly report count a period only from the day it was added.
      const slot = await insertSlot(client, actor.schoolId, input, clock.now());
      await writeAudit(client, actor.schoolId, [
        {
          actorId: actor.id, action: 'timetable.slot_added', entityType: 'timetable_slot', entityId: slot.id,
          metadata: { teacherId: input.teacherId, weekday: input.weekday },
        },
      ]);
      return slot;
    });
  } catch (error) {
    throw slotError(error);
  }
}

/**
 * Administrators remove a period. While it has relief still to come it is refused (409): the relief teacher has been or
 * will be told of that duty, so it must be cancelled first, the normal way, which tells them. Relief already over is kept
 * as history, as lesson records are.
 */
export async function removeTimetableSlot(actor: SessionUser, slotId: string, clock: Clock): Promise<void> {
  await withTransaction(async (client) => {
    if (!(await lockSlot(client, actor.schoolId, slotId))) throw new NotFoundError();
    const { today, time } = schoolNow(clock, actor.timeZone);
    if (await hasReliefToCome(client, actor.schoolId, slotId, today, time)) {
      throw new ConflictError('This period has relief arranged. Cancel that relief first.', { slotId: 'has_relief' });
    }
    const teacherId = await deleteSlot(client, actor.schoolId, slotId);
    if (!teacherId) throw new NotFoundError();
    await writeAudit(client, actor.schoolId, [
      { actorId: actor.id, action: 'timetable.slot_removed', entityType: 'timetable_slot', entityId: slotId, metadata: { teacherId } },
    ]);
  });
}
