import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';

export interface Student {
  name: string;
  className: string;
}

/** How well the student is doing in one subject, 0 to 100. */
export interface SubjectMastery {
  subject: SchoolSubjectKey;
  percent: number;
}

/** The starting numbers for this visit; quests, battles and purchases move them from here. */
export interface ProgressBaseline {
  xp: number;
  coins: number;
  /** Days in a row before today. */
  streak: number;
  classHandedIn: number;
  classTotal: number;
}
