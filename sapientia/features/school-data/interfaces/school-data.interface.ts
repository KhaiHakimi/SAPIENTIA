import type { TimeTaken } from '@/features/tasks/interfaces/task.interface';

/** The three lists an administrator keeps for the school; the word is also the last part of the API path. */
export type SchoolDataKind = 'subjects' | 'classes' | 'task-types';

/** A row of GET /api/school-data/:kind. Only task types carry an estimate. */
export interface SchoolDataItem {
  id: string;
  name: string;
  estimatedMinutes: number | null;
}

/**
 * A row of GET /api/task-type-feedback: how long people said finished tasks of this type took, as counts per band. Never
 * who answered. A type appears only once it has enough answers.
 */
export interface TaskTypeFeedback {
  taskTypeId: string;
  name: string;
  estimatedMinutes: number;
  answers: Record<TimeTaken, number>;
}

export interface NewSchoolDataItem {
  name: string;
  estimatedMinutes?: number;
}
