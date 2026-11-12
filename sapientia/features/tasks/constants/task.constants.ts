import type { AssignmentStatus, TimeTaken } from '../interfaces/task.interface';

/** Board column order. */
export const ASSIGNMENT_STATUSES = ['todo', 'in_progress', 'waiting', 'done'] as const satisfies readonly AssignmentStatus[];

/** Shortest first. */
export const TIME_TAKEN_OPTIONS = ['under_1h', '1_to_3h', 'over_3h'] as const satisfies readonly TimeTaken[];

export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 5000;
export const COMMENT_MAX = 2000;
export const ASSIGNEES_MAX = 100;
/** The task page shows the latest comments up to this many; a longer thread is a sign the task should be split. */
export const COMMENTS_SHOWN_MAX = 200;
