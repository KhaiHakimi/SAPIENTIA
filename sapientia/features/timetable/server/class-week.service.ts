import 'server-only';
import { DateTime } from 'luxon';
import { loadWorkingCalendar } from '@/features/delivery/server/school-calendar.repository';
import { isWorkingDay } from '@/features/delivery/services/working-time.service';
import type { IsoWeekday } from '@/features/delivery/interfaces/working-calendar.interface';
import type { SessionStudent } from '@/features/students/interfaces/student.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { getPool } from '@/shared/server/database.service';
import type { ClassDay, ClassWeek } from '../interfaces/timetable.interface';
import { listClassLessons, listCoveredPeriods } from './timetable.repository';

/**
 * The pupil's week (plan Phase 4, Sprint 12), built from the teachers' timetables for the pupil's class: Monday to Sunday,
 * lessons only on school days, and a lesson marked as relief on a date a relief teacher covers it. The pupil and class come
 * from the session; a pupil with no class gets an empty week.
 */
export async function getClassWeek(student: SessionStudent, weekOf: string | undefined, clock: Clock): Promise<ClassWeek> {
  const db = getPool();
  const now = clock.now();
  const anchor = weekOf ? DateTime.fromISO(weekOf, { zone: student.timeZone }) : DateTime.fromJSDate(now, { zone: student.timeZone });
  const monday = anchor.startOf('week');
  const dates = Array.from({ length: 7 }, (_, offset) => monday.plus({ days: offset }).toISODate() ?? '');
  const calendar = await loadWorkingCalendar(db, student.schoolId, monday.toJSDate());

  const lessons = student.classId ? await listClassLessons(db, student.schoolId, student.classId) : [];
  const covered = lessons.length === 0 ? [] : await listCoveredPeriods(
    db, student.schoolId, lessons.map((lesson) => lesson.id), { fromDate: dates[0], toDate: dates[6] }, now,
  );
  const coveredKeys = new Set(covered.map((row) => `${row.slot_id}|${row.on_date}`));

  const days = dates.map((date, index): ClassDay => {
    const weekday = (index + 1) as IsoWeekday;
    const schoolDay = isWorkingDay(date, calendar);
    return {
      date,
      weekday,
      schoolDay,
      lessons: schoolDay
        ? lessons.filter((lesson) => lesson.weekday === weekday).map((lesson) => ({
            startTime: lesson.start_time,
            endTime: lesson.end_time,
            subjectName: lesson.subject_name,
            relief: coveredKeys.has(`${lesson.id}|${date}`),
          }))
        : [],
    };
  });
  return { weekOf: dates[0], days };
}
