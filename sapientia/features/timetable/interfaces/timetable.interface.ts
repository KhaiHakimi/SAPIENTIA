import type { IsoWeekday } from '@/features/delivery/interfaces/working-calendar.interface';

/**
 * One weekly period on a teacher's timetable: a lesson (class and subject) or another fixed duty (label). Times are "HH:mm",
 * school-local, the same every week.
 */
export interface TimetableSlot {
  id: string;
  weekday: IsoWeekday;
  startTime: string;
  endTime: string;
  class: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  label: string | null;
}

/** GET /api/timetable: one teacher's week. */
export interface Timetable {
  teacher: { id: string; name: string };
  slots: TimetableSlot[];
}

/** POST /api/timetable/slots. */
export interface NewTimetableSlot {
  teacherId: string;
  weekday: IsoWeekday;
  startTime: string;
  endTime: string;
  classId?: string;
  subjectId?: string;
  label?: string;
}

/** One lesson on a pupil's day: times "HH:mm", school-local. relief: a relief teacher covers it on this date. */
export interface ClassLesson {
  startTime: string;
  endTime: string;
  subjectName: string;
  relief: boolean;
}

/** One day of a class's week. A day off (weekend or holiday) has no lessons. */
export interface ClassDay {
  date: string;
  weekday: IsoWeekday;
  schoolDay: boolean;
  lessons: ClassLesson[];
}

/** GET /api/student/timetable: the pupil's class, Monday to Sunday of the week asked for. */
export interface ClassWeek {
  weekOf: string;
  days: ClassDay[];
}
