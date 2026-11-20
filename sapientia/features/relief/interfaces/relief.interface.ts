import type { TimetableSlot } from '@/features/timetable/interfaces/timetable.interface';

interface PersonRef {
  id: string;
  name: string;
}

/** Who covers a period, and when they are told: held is true until deliverAt, which is never outside working hours. */
export interface ReliefCover {
  id: string;
  reliefTeacher: PersonRef;
  deliverAt: string;
  held: boolean;
}

/** GET /api/relief?teacherId=&onDate=: one teacher's periods on one date, each with its relief if one is arranged. */
export interface ReliefDay {
  teacher: PersonRef;
  onDate: string;
  /** False on a weekend or holiday, and for a date already past: nothing can be arranged then. */
  canArrange: boolean;
  periods: { slot: TimetableSlot; relief: ReliefCover | null }[];
}

/**
 * One person who is free in the period. The two figures are why they are suggested, in the order they are compared: fewest
 * relief classes this month, then least estimated work due this week.
 */
export interface ReliefSuggestion {
  teacher: PersonRef;
  reliefThisMonth: number;
  committedMinutesThisWeek: number;
}

/** GET /api/relief/suggestions?slotId=&onDate=. At most three. */
export interface ReliefSuggestions {
  items: ReliefSuggestion[];
}

/** POST /api/relief. */
export interface NewRelief {
  slotId: string;
  onDate: string;
  reliefTeacherId: string;
}

/** The answer to POST /api/relief: held is true when the relief teacher will only be told at deliverAt. */
export interface ReliefAssigned {
  id: string;
  deliverAt: string;
  held: boolean;
}

/** A row of GET /api/relief/mine: a period the caller covers for a colleague. */
export interface ReliefDuty {
  id: string;
  onDate: string;
  startTime: string;
  endTime: string;
  class: PersonRef | null;
  subject: PersonRef | null;
  label: string | null;
  absentTeacher: PersonRef;
}
