import type { PupilComment } from '@/features/homework/interfaces/homework.interface';

/** Where a quest's due date stands against the school's today. */
export type DueStatus = 'overdue' | 'today' | 'tomorrow' | 'later';

/**
 * A piece of the class's homework, shown as a room on the quest map. The text is the teacher's own, in the language they
 * wrote it, so it is not translated.
 */
export interface Quest {
  id: string;
  subjectName: string;
  title: string;
  teacherName: string;
  details: string | null;
  /** YYYY-MM-DD, school-local. */
  dueOn: string;
  xp: number;
  coins: number;
  /**
   * The teacher has recorded the hand-in. The room is cleared for good: the pupil cannot undo it, and it pays nothing on this
   * visit, since it was done before.
   */
  handedIn: boolean;
  /** The teacher's notes to this pupil on this homework (Sprint 14). The pupil cannot reply. */
  comments: PupilComment[];
}

/** The rooms the pupil has ticked on this visit, by quest id: their own checklist, apart from the teacher's record. */
export type QuestDoneMap = Readonly<Record<string, boolean>>;

/** Where the homework list stands while it loads. */
export type QuestsStatus = 'loading' | 'error' | 'ready';
