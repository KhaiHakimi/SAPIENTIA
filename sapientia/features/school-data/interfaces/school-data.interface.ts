/** The three lists an administrator keeps for the school; the word is also the last part of the API path. */
export type SchoolDataKind = 'subjects' | 'classes' | 'task-types';

/** A row of GET /api/school-data/:kind. Only task types carry an estimate. */
export interface SchoolDataItem {
  id: string;
  name: string;
  estimatedMinutes: number | null;
}

export interface NewSchoolDataItem {
  name: string;
  estimatedMinutes?: number;
}
