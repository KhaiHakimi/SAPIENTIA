import type { Feasibility } from '@/features/capacity/interfaces/capacity.interface';

/** A class and subject the teacher has on their own timetable: the only pairs they may set homework for. */
export interface HomeworkLesson {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

/** A piece of homework as its setter sees it. Dates are YYYY-MM-DD, school-local. */
export interface Homework {
  id: string;
  class: { id: string; name: string };
  subject: { id: string; name: string };
  title: string;
  details: string | null;
  dueOn: string;
  markingMinutes: number | null;
  markBy: string | null;
  marked: boolean;
  loadFlagged: boolean;
  handedInCount: number;
  pupilCount: number;
}

/** GET /api/homework: the caller's lessons (for the form) and their homework from two weeks ago onwards. */
export interface MyHomework {
  lessons: HomeworkLesson[];
  items: Homework[];
}

/** POST /api/homework. markingMinutes and markBy come together or not at all. */
export interface SetHomeworkRequest {
  classId: string;
  subjectId: string;
  title: string;
  details?: string;
  dueOn: string;
  markingMinutes?: number;
  markBy?: string;
}

/** POST /api/homework/preview: what the form knows before the title is typed. */
export type HomeworkPreviewRequest = Pick<SetHomeworkRequest, 'classId' | 'subjectId' | 'dueOn' | 'markingMinutes' | 'markBy'>;

/** One piece of the class's homework in the week of the due date: the date and subject only, never who set it. */
export interface ClassHomeworkDay {
  dueOn: string;
  subjectName: string;
}

/** The answer to the preview: the class's week, the same-day warning, and whether the marking time exists. */
export interface HomeworkPreview {
  week: ClassHomeworkDay[];
  /** Homework the class already has due on the chosen day. */
  sameDay: number;
  /** True when this homework would be the third or more due that day for the class. */
  loadWarning: boolean;
  /** The capacity check for the marking estimate; null without one. */
  marking: Feasibility | null;
}

/** PATCH /api/homework/:id. */
export interface UpdateHomeworkRequest {
  marked: boolean;
}

/** One pupil on the hand-in list. */
export interface HandInPupil {
  id: string;
  name: string;
  handedIn: boolean;
}

/** GET /api/homework/:id/hand-ins: the class's current pupils by name. The setter only. */
export interface HandInList {
  homework: Homework;
  pupils: HandInPupil[];
}

/** PUT /api/homework/:id/hand-ins/:studentId. */
export interface HandInRequest {
  handedIn: boolean;
}

/** One piece of homework as a pupil sees it: their own hand-in only. */
export interface PupilHomework {
  id: string;
  subjectName: string;
  teacherName: string;
  title: string;
  details: string | null;
  dueOn: string;
  handedIn: boolean;
}

/**
 * The class's hand-ins for homework due this week (Monday to Sunday), counted over the class's current pupils: a shared goal
 * with no names. expected is pieces of homework times pupils.
 */
export interface ClassGoal {
  handedIn: number;
  expected: number;
}

/** GET /api/student/homework. classGoal is null when the class is too small to show it without pointing at anyone. */
export interface PupilHomeworkList {
  items: PupilHomework[];
  classGoal: ClassGoal | null;
}
