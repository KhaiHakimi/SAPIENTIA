import type { TimetableSlot } from '@/features/timetable/interfaces/timetable.interface';

export type LessonStatus = 'held' | 'not_held';

export type NotHeldReason = 'official_duty' | 'leave' | 'school_programme' | 'pupils_away' | 'examination' | 'other';

interface PersonRef {
  id: string;
  name: string;
}

/** What was recorded for one period on one date. */
export interface LessonRecord {
  status: LessonStatus;
  /** Set exactly when the lesson was not held. */
  reason: NotHeldReason | null;
  note: string | null;
  /** An https link to the teacher's e-RPH entry, or null. */
  erphUrl: string | null;
  recordedBy: PersonRef;
  updatedAt: string;
}

/**
 * One period in the caller's day. "own" is their timetable; "relief" is a colleague's period they cover. An own period
 * covered by someone else has coveredBy set, and only the relief teacher records it.
 */
export interface LessonPeriod {
  slot: TimetableSlot;
  kind: 'own' | 'relief';
  absentTeacher: PersonRef | null;
  coveredBy: PersonRef | null;
  record: LessonRecord | null;
  /** False when the period has not started yet, is too long ago, or someone else records it. */
  canRecord: boolean;
}

/** GET /api/lessons?onDate=: the caller's periods on one date. */
export interface LessonDay {
  onDate: string;
  /** False on a weekend or holiday, in the future, or further back than records are kept open. */
  recordable: boolean;
  periods: LessonPeriod[];
}

/** PUT /api/lessons/records: records or changes one period on one date. */
export interface LessonRecordInput {
  slotId: string;
  onDate: string;
  status: LessonStatus;
  reason?: NotHeldReason;
  note?: string;
  erphUrl?: string;
}
