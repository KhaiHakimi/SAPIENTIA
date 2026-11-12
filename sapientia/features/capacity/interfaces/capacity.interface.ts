import type { IsoWeekday, WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';

/** One recurring timetable period: the same weekday and times every week. Times are "HH:mm", school-local. */
export interface WeeklySlot {
  weekday: IsoWeekday;
  start: string;
  end: string;
}

/** Work a teacher already has: an open task's estimate and the day it is due (YYYY-MM-DD). */
export interface Commitment {
  dueOn: string;
  minutes: number;
}

export interface FeasibilityInput {
  calendar: WorkingCalendar;
  slots: readonly WeeklySlot[];
  commitments: readonly Commitment[];
  /** When the task reaches the teacher: a held task starts counting from its delivery time. */
  from: Date;
  /** YYYY-MM-DD, school-local. The whole working day counts. */
  dueOn: string;
  neededMinutes: number;
}

/**
 * Whether the time exists, and why not when it does not. The totals cover the period from delivery to the end of the due
 * day: free = working - teaching - committed, never below zero.
 */
export interface Feasibility {
  feasible: boolean;
  neededMinutes: number;
  freeMinutes: number;
  workingMinutes: number;
  teachingMinutes: number;
  committedMinutes: number;
  /** The first day by which the time does exist; null if there is none within the look-ahead. */
  earliestDueOn: string | null;
}

/** One assignee's answer from POST /api/tasks/feasibility. */
export interface AssigneeFeasibility extends Feasibility {
  assignee: { id: string; name: string };
}

export interface FeasibilityRequest {
  assigneeIds: string[];
  dueOn: string;
  estimatedMinutes: number;
  urgent?: boolean;
}

export interface FeasibilityResponse {
  items: AssigneeFeasibility[];
}

/** GET /api/staff/workload: estimated, unfinished work due by the end of this week, per person. People with none are left out. */
export interface Workload {
  /** The Sunday that ends the current week (YYYY-MM-DD, school-local). */
  weekEndsOn: string;
  items: { userId: string; committedMinutes: number }[];
}
