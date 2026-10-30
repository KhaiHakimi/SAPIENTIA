import 'server-only';
import { DateTime } from 'luxon';
import type { Queryable } from '@/shared/server/database.service';
import { CALENDAR_LOOKAHEAD_DAYS, DEFAULT_WEEKEND, DEFAULT_WORK_END, DEFAULT_WORK_START } from '../constants/delivery.constants';
import type {
  CalendarEvent, CalendarEventKind, IsoWeekday, SchoolSettings, WorkingCalendar,
} from '../interfaces/working-calendar.interface';

/** Every function takes schoolId first and filters on it. */

/** The school's settings, or the defaults until an administrator has saved some. */
export async function loadSettings(db: Queryable, schoolId: string): Promise<SchoolSettings> {
  const { rows } = await db.query<{
    time_zone: string; work_start: string | null; work_end: string | null; weekend_days: number[] | null; state_code: string | null;
  }>(
    `SELECT s.time_zone, to_char(ss.work_start, 'HH24:MI') AS work_start, to_char(ss.work_end, 'HH24:MI') AS work_end,
            ss.weekend_days, ss.state_code
       FROM schools s LEFT JOIN school_settings ss ON ss.school_id = s.id
      WHERE s.id = $1`,
    [schoolId],
  );
  const row = rows[0];
  return {
    timeZone: row.time_zone,
    workStart: row.work_start ?? DEFAULT_WORK_START,
    workEnd: row.work_end ?? DEFAULT_WORK_END,
    weekendDays: (row.weekend_days ?? [...DEFAULT_WEEKEND]) as IsoWeekday[],
    stateCode: row.state_code,
  };
}

export async function saveSettings(db: Queryable, schoolId: string, settings: SchoolSettings, actorId: string, now: Date) {
  await db.query(
    `INSERT INTO school_settings (school_id, work_start, work_end, weekend_days, state_code, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (school_id) DO UPDATE SET work_start = EXCLUDED.work_start, work_end = EXCLUDED.work_end,
       weekend_days = EXCLUDED.weekend_days, state_code = EXCLUDED.state_code, updated_at = EXCLUDED.updated_at,
       updated_by = EXCLUDED.updated_by`,
    [schoolId, settings.workStart, settings.workEnd, settings.weekendDays, settings.stateCode, now, actorId],
  );
}

/** Settings plus every holiday and replacement day from yesterday to a year ahead: all the delivery rules need. */
export async function loadWorkingCalendar(db: Queryable, schoolId: string, from: Date): Promise<WorkingCalendar> {
  const settings = await loadSettings(db, schoolId);
  const start = DateTime.fromJSDate(from, { zone: settings.timeZone }).minus({ days: 1 });
  const events = await listEvents(db, schoolId, start.toISODate() ?? '', start.plus({ days: CALENDAR_LOOKAHEAD_DAYS + 2 }).toISODate() ?? '');
  return {
    timeZone: settings.timeZone,
    workStart: settings.workStart,
    workEnd: settings.workEnd,
    weekendDays: settings.weekendDays,
    holidays: new Set(events.filter((event) => event.kind === 'holiday').map((event) => event.onDate)),
    extraWorkingDays: new Set(events.filter((event) => event.kind === 'working_day').map((event) => event.onDate)),
  };
}

export async function listEvents(db: Queryable, schoolId: string, fromDate: string, toDate: string): Promise<CalendarEvent[]> {
  const { rows } = await db.query<{ id: string; on_date: string; kind: CalendarEventKind; title: string }>(
    `SELECT id, on_date::text AS on_date, kind, title FROM calendar_events
      WHERE school_id = $1 AND on_date BETWEEN $2::date AND $3::date ORDER BY on_date`,
    [schoolId, fromDate, toDate],
  );
  return rows.map((row) => ({ id: row.id, onDate: row.on_date, kind: row.kind, title: row.title }));
}

export async function insertEvent(
  db: Queryable,
  schoolId: string,
  event: { onDate: string; kind: CalendarEventKind; title: string; createdBy: string },
): Promise<CalendarEvent> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO calendar_events (school_id, on_date, kind, title, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [schoolId, event.onDate, event.kind, event.title, event.createdBy],
  );
  return { id: rows[0].id, onDate: event.onDate, kind: event.kind, title: event.title };
}

/** True if a row in this school was removed. */
export async function deleteEvent(db: Queryable, schoolId: string, eventId: string): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM calendar_events WHERE school_id = $1 AND id = $2', [schoolId, eventId]);
  return (rowCount ?? 0) > 0;
}
