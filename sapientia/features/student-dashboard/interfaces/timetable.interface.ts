import type { TextOrLocalized } from '@/shared/interfaces/localized-text.interface';
import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';

/** One lesson. Times are "HH:MM" in school time. */
export interface TimetableSlot {
  from: string;
  to: string;
  subject: SchoolSubjectKey;
  room: TextOrLocalized;
  /** A relief teacher covers this lesson. */
  relief?: boolean;
}

/** Monday to Friday, each a list of lessons in order. */
export type SchoolWeek = readonly (readonly TimetableSlot[])[];

export type SlotStatus = 'past' | 'now' | 'upcoming';
