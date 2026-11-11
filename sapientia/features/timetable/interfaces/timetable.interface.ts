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
