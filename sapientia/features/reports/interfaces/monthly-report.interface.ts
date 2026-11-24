import type { WeeklySlot, DatedSlot } from '@/features/capacity/interfaces/capacity.interface';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import type { SharedHoursTotal } from '@/features/hours/interfaces/hours.interface';
import type { LessonStatus, NotHeldReason } from '@/features/lessons/interfaces/lesson.interface';

export type ReportFormat = 'pdf' | 'xlsx';

/** Held, not held and not recorded for a group of scheduled lessons. scheduled = held + notHeld + notRecorded. */
export interface LessonCounts {
  scheduled: number;
  held: number;
  notHeld: number;
  notRecorded: number;
}

export interface SubjectLessonCounts extends LessonCounts {
  /** The subject's name, or null for a lesson with no subject (a period deleted before Sprint 6 data existed). */
  subject: string | null;
}

export interface MonthlyLessons extends LessonCounts {
  reasons: Record<NotHeldReason, number>;
  bySubject: SubjectLessonCounts[];
  /** Relief arranged in the period, and how many of those classes the relief teacher recorded as held. */
  relief: { arranged: number; recordedHeld: number };
}

export interface UrgentOverride {
  /** The school-local day the task was sent. */
  onDate: string;
  reason: string;
}

export interface MonthlyTasks {
  /** Tasks that reached their assignees in the period. */
  delivered: number;
  /** Assignments due in the period (each assignee's own due date), and how each one stands now. */
  due: number;
  doneOnTime: number;
  doneLate: number;
  notDone: number;
  /** Tasks sent in the period after the sender was told the time did not exist (Phase 2: warn, never block). */
  flaggedDeadlines: number;
  /** Tasks sent in the period that skipped held delivery: how many, and the reasons senders gave (oldest first, capped). */
  urgentOverrides: { count: number; listed: UrgentOverride[] };
  extensions: { requested: number; approved: number; countered: number; pending: number };
}

/**
 * School-level wellbeing indicators (plan Phase 3). Never per person: the averages are withheld when fewer people teach
 * than WELLBEING_MIN_GROUP, because an average of two or three people singles them out.
 */
export interface MonthlyWellbeing {
  /** Active staff with at least one timetable period. */
  teachingStaff: number;
  workingDays: number;
  /** False when there are too few teaching staff to show averages without singling anyone out. */
  averagesShown: boolean;
  /** Working time with no timetable period or relief class, per teacher per working day. */
  averageFreeMinutesPerDay: number | null;
  /** Estimated task work due in the period, per teacher. */
  averageTaskMinutes: number | null;
  flaggedDeadlines: number;
  extensionRequests: number;
}

/** GET /api/reports/monthly?month=YYYY-MM. Administrators only. */
export interface MonthlyReport {
  month: string;
  schoolName: string;
  /** The days counted: the whole month once it is over; the current month up to yesterday. Null before the first day ends. */
  period: { from: string; to: string } | null;
  generatedAt: string;
  timeZone: string;
  lessons: MonthlyLessons;
  tasks: MonthlyTasks;
  wellbeing: MonthlyWellbeing;
  /** Totals people chose to share from their private hours log, by name. Never an entry. */
  sharedHours: SharedHoursTotal[];
}

// What the pure report rules are given. Rows come from the database already limited to the school and the period.

/** A lesson period on the timetable: weekday, subject, and the school-local day it was added (it is not scheduled before). */
export interface ScheduledSlot {
  id: string;
  weekday: number;
  subjectName: string | null;
  createdOn: string;
  /**
   * The school-local day the teacher's login was removed, or null. From then on nobody records the period, so it is not
   * scheduled: it would only ever read as "not recorded" until an administrator takes it off.
   */
  teacherRemovedOn: string | null;
}

/** A lesson record in the period. slotId is null when its period has since been deleted. */
export interface LessonRecordFact {
  slotId: string | null;
  onDate: string;
  subjectName: string | null;
  status: LessonStatus;
  reason: NotHeldReason | null;
}

export interface LessonInput {
  calendar: WorkingCalendar;
  period: { from: string; to: string } | null;
  slots: readonly ScheduledSlot[];
  records: readonly LessonRecordFact[];
}

export interface WellbeingInput {
  calendar: WorkingCalendar;
  period: { from: string; to: string } | null;
  /** Each teaching member of staff's weekly periods and relief classes in the period. */
  teachers: readonly { slots: readonly WeeklySlot[]; datedSlots: readonly DatedSlot[] }[];
  /** Estimated minutes of task work due in the period, across all teaching staff. */
  taskMinutes: number;
  flaggedDeadlines: number;
  extensionRequests: number;
}
