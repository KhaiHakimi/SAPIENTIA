import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { loadWorkingCalendar } from '@/features/delivery/server/school-calendar.repository';
import { isWorkingDay } from '@/features/delivery/services/working-time.service';
import { toSlot } from '@/features/timetable/server/timetable.repository';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import { deleteStoredFile } from '@/shared/server/files/stored-files.repository';
import { discardBytes, storeUpload } from '@/shared/server/files/upload.service';
import type { CheckedUpload } from '@/shared/interfaces/stored-file.interface';
import { LESSON_RECORD_DAYS_BACK } from '../constants/lessons.constants';
import type { LessonDay, LessonRecord, LessonRecordInput, LessonTarget } from '../interfaces/lesson.interface';
import {
  type DayPeriodRow, findPeriodOnDate, findRecord, listDayPeriods, listRecords, setRecordPhoto, upsertRecord,
} from './lessons.repository';

/** Where "now" sits in the school's calendar: today's date, the time of day, and the oldest date still open. */
function schoolMoment(now: Date, calendar: WorkingCalendar) {
  const local = DateTime.fromJSDate(now, { zone: calendar.timeZone });
  return {
    today: local.toISODate() ?? '',
    time: local.toFormat('HH:mm'),
    oldest: local.minus({ days: LESSON_RECORD_DAYS_BACK }).toISODate() ?? '',
  };
}

/**
 * Who records a period on a date: its own teacher, or, once relief is arranged, the relief teacher, and only after the
 * relief has been delivered to them. Until then nobody does, the absent teacher included.
 */
function recorderOf(period: DayPeriodRow, now: Date): string | null {
  if (!period.cover) return period.teacher_id;
  return period.cover.deliver_at.getTime() <= now.getTime() ? period.cover.relief_teacher_id : null;
}

/**
 * The period, when the caller may record it on that date: they are its recorder (anyone else gets 404), and the date is the
 * period's weekday, a working day, already started, and no more than 30 days back.
 */
async function findRecordablePeriod(
  client: Queryable,
  actor: SessionUser,
  target: { slotId: string; onDate: string },
  now: Date,
): Promise<DayPeriodRow> {
  const period = await findPeriodOnDate(client, actor.schoolId, target.slotId, target.onDate);
  if (!period || recorderOf(period, now) !== actor.id) throw new NotFoundError();

  const calendar = await loadWorkingCalendar(client, actor.schoolId, now);
  const moment = schoolMoment(now, calendar);
  if (DateTime.fromISO(target.onDate, { zone: calendar.timeZone }).weekday !== period.weekday) {
    throw new ValidationError({ onDate: 'wrong_weekday' });
  }
  if (target.onDate > moment.today || (target.onDate === moment.today && period.start_time > moment.time)) {
    throw new ValidationError({ onDate: 'not_started' });
  }
  if (target.onDate < moment.oldest) throw new ValidationError({ onDate: 'too_old' });
  if (!isWorkingDay(target.onDate, calendar)) throw new ValidationError({ onDate: 'not_working_day' });
  return period;
}

/** The caller's periods on a date (their own, and colleagues' they cover), each with its record and whether they can record it. */
export async function getLessonDay(actor: SessionUser, onDate: string, clock: Clock): Promise<LessonDay> {
  const db = getPool();
  const now = clock.now();
  const calendar = await loadWorkingCalendar(db, actor.schoolId, now);
  const moment = schoolMoment(now, calendar);
  const weekday = DateTime.fromISO(onDate, { zone: calendar.timeZone }).weekday;
  const recordable = isWorkingDay(onDate, calendar) && onDate <= moment.today && onDate >= moment.oldest;

  const rows = await listDayPeriods(db, actor.schoolId, actor.id, weekday, onDate, now);
  const records = await listRecords(db, actor.schoolId, rows.map((row) => row.id), onDate);
  return {
    onDate,
    recordable,
    periods: rows.map((row) => {
      const own = row.teacher_id === actor.id;
      const started = onDate < moment.today || row.start_time <= moment.time;
      return {
        slot: toSlot(row),
        kind: own ? 'own' : 'relief',
        absentTeacher: !own && row.cover ? { id: row.cover.absent_teacher_id, name: row.cover.absent_teacher_name } : null,
        coveredBy: own && row.cover ? { id: row.cover.relief_teacher_id, name: row.cover.relief_teacher_name } : null,
        record: records.get(row.id) ?? null,
        canRecord: recordable && started && recorderOf(row, now) === actor.id,
      };
    }),
  };
}

/**
 * Records one period as held or not held, or changes that record. Anyone but the period's recorder gets 404. The date must
 * be the period's weekday, a working day, already started, and no more than 30 days back. Every record and change is in
 * the audit log (which period, which date, held or not); the note and the link are not.
 */
export async function recordLesson(actor: SessionUser, input: LessonRecordInput, clock: Clock): Promise<LessonRecord> {
  return withTransaction(async (client) => {
    const now = clock.now();
    const period = await findRecordablePeriod(client, actor, input, now);
    const saved = await upsertRecord(client, actor.schoolId, {
      slot: period, onDate: input.onDate, recordedBy: actor.id, status: input.status, reason: input.reason ?? null,
      note: input.note ?? null, erphUrl: input.erphUrl ?? null, now,
    });
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'lesson.recorded', entityType: 'lesson_record', entityId: saved.id,
      metadata: { slotId: period.id, onDate: input.onDate, status: input.status, changed: !saved.created },
    }]);
    return (await findRecord(client, actor.schoolId, period.id, input.onDate)) as LessonRecord;
  });
}

/**
 * Adds a photo to a lesson record, replacing any photo already there. Same rules as recording: only the recorder, only
 * while the record is still open. The lesson must be recorded first. The audit log says a photo was added, not what it is.
 */
export async function addLessonPhoto(actor: SessionUser, target: LessonTarget, photo: CheckedUpload, clock: Clock): Promise<LessonRecord> {
  const now = clock.now();
  const { record, replacedKey } = await storeUpload(actor, { file: photo, purpose: 'lesson_photo', field: 'photo', now }, async (client, fileId) => {
    await findRecordablePeriod(client, actor, target, now);
    const { recordId, previous } = await setRecordPhoto(client, actor.schoolId, { ...target, photoFileId: fileId, now });
    if (!recordId) throw new ValidationError({ photo: 'record_first' });
    const key = previous ? await deleteStoredFile(client, actor.schoolId, previous) : null;
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'lesson.photo_added', entityType: 'lesson_record', entityId: recordId,
      metadata: { onDate: target.onDate, replaced: Boolean(previous) },
    }]);
    return { record: (await findRecord(client, actor.schoolId, target.slotId, target.onDate)) as LessonRecord, replacedKey: key };
  });
  await discardBytes([replacedKey]);
  return record;
}

/** Removes the photo from a lesson record. Removing one that is not there changes nothing. */
export async function removeLessonPhoto(actor: SessionUser, target: LessonTarget, clock: Clock): Promise<void> {
  const now = clock.now();
  const removedKey = await withTransaction(async (client) => {
    await findRecordablePeriod(client, actor, target, now);
    const { recordId, previous } = await setRecordPhoto(client, actor.schoolId, { ...target, photoFileId: null, now });
    if (!recordId || !previous) return null;
    const key = await deleteStoredFile(client, actor.schoolId, previous);
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: 'lesson.photo_removed', entityType: 'lesson_record', entityId: recordId,
      metadata: { onDate: target.onDate },
    }]);
    return key;
  });
  await discardBytes([removedKey]);
}
