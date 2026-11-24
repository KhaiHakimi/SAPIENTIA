import 'server-only';
import { SLOT_COLUMNS, SLOT_JOINS, type SlotRow } from '@/features/timetable/server/timetable.repository';
import type { Queryable } from '@/shared/server/database.service';
import type { LessonRecord, LessonStatus, NotHeldReason } from '../interfaces/lesson.interface';

/** Every function takes schoolId first and filters on it. Dates are read as text so no time zone can shift the day. */

export interface CoverRow {
  slot_id: string;
  relief_teacher_id: string;
  relief_teacher_name: string;
  absent_teacher_id: string;
  absent_teacher_name: string;
  deliver_at: Date;
}

export interface DayPeriodRow extends SlotRow {
  /** When the period was added: it was not on the timetable, so cannot have been taught, before then. */
  created_at: Date;
  /** Relief arranged for this period on the date, if any. */
  cover: CoverRow | null;
}

/**
 * Every period one person is involved in on a date: their own periods for that weekday, and colleagues' periods they cover
 * that day (only once the relief has been delivered to them, as held delivery requires). Each comes with its relief, if any.
 */
export async function listDayPeriods(
  db: Queryable,
  schoolId: string,
  teacherId: string,
  weekday: number,
  onDate: string,
  now: Date,
): Promise<DayPeriodRow[]> {
  const { rows } = await db.query<SlotRow & Partial<CoverRow> & { relief_slot: string | null; created_at: Date }>(
    `SELECT ${SLOT_COLUMNS}, s.created_at, r.slot_id AS relief_slot, r.relief_teacher_id, rt.name AS relief_teacher_name,
            r.absent_teacher_id, ab.name AS absent_teacher_name, r.deliver_at
       FROM timetable_slots s ${SLOT_JOINS}
       LEFT JOIN relief_assignments r ON r.slot_id = s.id AND r.school_id = s.school_id AND r.on_date = $4::date
       LEFT JOIN users rt ON rt.id = r.relief_teacher_id AND rt.school_id = r.school_id
       LEFT JOIN users ab ON ab.id = r.absent_teacher_id AND ab.school_id = r.school_id
      WHERE s.school_id = $1 AND s.weekday = $3
        AND (s.teacher_id = $2 OR (r.relief_teacher_id = $2 AND r.deliver_at <= $5))
      ORDER BY s.start_time`,
    [schoolId, teacherId, weekday, onDate, now],
  );
  return rows.map((row) => ({
    ...row,
    cover: row.relief_slot
      ? {
          slot_id: row.relief_slot,
          relief_teacher_id: row.relief_teacher_id as string,
          relief_teacher_name: row.relief_teacher_name as string,
          absent_teacher_id: row.absent_teacher_id as string,
          absent_teacher_name: row.absent_teacher_name as string,
          deliver_at: row.deliver_at as Date,
        }
      : null,
  }));
}

/** One period and the relief arranged for it on the date, if any; null when the period is not in this school. */
export async function findPeriodOnDate(db: Queryable, schoolId: string, slotId: string, onDate: string): Promise<DayPeriodRow | null> {
  const { rows } = await db.query<SlotRow & { created_at: Date; relief_teacher_id: string | null; deliver_at: Date | null }>(
    `SELECT ${SLOT_COLUMNS}, s.created_at, r.relief_teacher_id, r.deliver_at
       FROM timetable_slots s ${SLOT_JOINS}
       LEFT JOIN relief_assignments r ON r.slot_id = s.id AND r.school_id = s.school_id AND r.on_date = $3::date
      WHERE s.school_id = $1 AND s.id = $2`,
    [schoolId, slotId, onDate],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    cover: row.relief_teacher_id && row.deliver_at
      ? {
          slot_id: row.id, relief_teacher_id: row.relief_teacher_id, relief_teacher_name: '', absent_teacher_id: row.teacher_id,
          absent_teacher_name: '', deliver_at: row.deliver_at,
        }
      : null,
  };
}

interface RecordRow {
  slot_id: string;
  status: LessonStatus;
  reason: NotHeldReason | null;
  note: string | null;
  erph_url: string | null;
  photo_file_id: string | null;
  recorded_by: string;
  recorder_name: string;
  updated_at: Date;
}

const toRecord = (row: RecordRow): LessonRecord => ({
  status: row.status,
  reason: row.reason,
  note: row.note,
  erphUrl: row.erph_url,
  photoFileId: row.photo_file_id,
  recordedBy: { id: row.recorded_by, name: row.recorder_name },
  updatedAt: row.updated_at.toISOString(),
});

const RECORD_SELECT = `SELECT l.slot_id, l.status, l.reason, l.note, l.erph_url, l.photo_file_id, l.recorded_by, u.name AS recorder_name,
    l.updated_at
  FROM lesson_records l JOIN users u ON u.id = l.recorded_by AND u.school_id = l.school_id`;

/** The records for some periods on one date, by period id. */
export async function listRecords(
  db: Queryable,
  schoolId: string,
  slotIds: readonly string[],
  onDate: string,
): Promise<Map<string, LessonRecord>> {
  if (slotIds.length === 0) return new Map();
  const { rows } = await db.query<RecordRow>(
    `${RECORD_SELECT} WHERE l.school_id = $1 AND l.slot_id = ANY($2::uuid[]) AND l.on_date = $3::date`,
    [schoolId, slotIds, onDate],
  );
  return new Map(rows.map((row) => [row.slot_id, toRecord(row)]));
}

export interface LessonRecordRow {
  slot: DayPeriodRow;
  onDate: string;
  recordedBy: string;
  status: LessonStatus;
  reason: NotHeldReason | null;
  note: string | null;
  erphUrl: string | null;
  now: Date;
}

/**
 * Records a period on a date, or changes the record already there (one per period per date). The period's time, class,
 * subject and teacher are copied in, so the record outlives changes to the timetable.
 */
export async function upsertRecord(db: Queryable, schoolId: string, record: LessonRecordRow): Promise<{ id: string; created: boolean }> {
  const { slot } = record;
  const { rows } = await db.query<{ id: string; created: boolean }>(
    `INSERT INTO lesson_records
       (school_id, slot_id, on_date, scheduled_teacher_id, start_time, end_time, class_name, subject_name, label,
        recorded_by, status, reason, note, erph_url, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
     ON CONFLICT (slot_id, on_date) DO UPDATE
       SET recorded_by = EXCLUDED.recorded_by, status = EXCLUDED.status, reason = EXCLUDED.reason, note = EXCLUDED.note,
           erph_url = EXCLUDED.erph_url, updated_at = EXCLUDED.updated_at
     RETURNING id, (xmax = 0) AS created`,
    [
      schoolId, slot.id, record.onDate, slot.teacher_id, slot.start_time, slot.end_time, slot.class_name, slot.subject_name, slot.label,
      record.recordedBy, record.status, record.reason, record.note, record.erphUrl, record.now,
    ],
  );
  return rows[0];
}

export async function findRecord(db: Queryable, schoolId: string, slotId: string, onDate: string): Promise<LessonRecord | null> {
  return (await listRecords(db, schoolId, [slotId], onDate)).get(slotId) ?? null;
}

/**
 * Sets or clears the photo on the record of a period on a date, and returns the record and the photo it replaces. recordId
 * is null when there is no record yet: a photo belongs to a record, so the lesson is marked first.
 */
export async function setRecordPhoto(
  db: Queryable,
  schoolId: string,
  record: { slotId: string; onDate: string; photoFileId: string | null; now: Date },
): Promise<{ recordId: string | null; previous: string | null }> {
  const { rows } = await db.query<{ id: string; previous: string | null }>(
    `UPDATE lesson_records l SET photo_file_id = $4, updated_at = $5
       FROM (SELECT id, photo_file_id FROM lesson_records WHERE school_id = $1 AND slot_id = $2 AND on_date = $3::date FOR UPDATE) old
      WHERE l.id = old.id
      RETURNING l.id, old.photo_file_id AS previous`,
    [schoolId, record.slotId, record.onDate, record.photoFileId, record.now],
  );
  return rows[0] ? { recordId: rows[0].id, previous: rows[0].previous } : { recordId: null, previous: null };
}

/** Whether someone may see a lesson photo: the same people as its record, its recorder and the period's own teacher. */
export async function canSeeLessonPhoto(db: Queryable, schoolId: string, fileId: string, userId: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM lesson_records WHERE school_id = $1 AND photo_file_id = $2 AND (recorded_by = $3 OR scheduled_teacher_id = $3)`,
    [schoolId, fileId, userId],
  );
  return rows.length > 0;
}
