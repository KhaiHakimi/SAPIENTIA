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

/** Whether a member of staff still works here: a disabled login can come back, a removed one (former staff) cannot. */
export type TeacherStatus = 'active' | 'disabled' | 'removed';

/**
 * A row of GET /api/timetable/teachers (administrators): everyone whose timetable they may need. Active staff, and staff
 * no longer active who still have periods, so that those periods can be covered or removed.
 */
export interface TimetableTeacher {
  id: string;
  name: string;
  status: TeacherStatus;
}

/** GET /api/timetable: one teacher's week. Periods can be added for an active teacher only. */
export interface Timetable {
  teacher: TimetableTeacher;
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

/** What a class week needs to know about the pupil: their school, its time zone, and their class (null: none). */
export interface ClassOfPupil {
  schoolId: string;
  timeZone: string;
  classId: string | null;
}
