import type { ExtensionRequest } from '@/features/extensions/interfaces/extension.interface';

export type AssignmentStatus = 'todo' | 'in_progress' | 'waiting' | 'done';

/** The optional answer to "how long did this take?" once a task is done: three broad bands, not a timesheet. */
export type TimeTaken = 'under_1h' | '1_to_3h' | 'over_3h';

export interface PersonRef {
  id: string;
  name: string;
}

/** A card on the assignee's board (GET /api/tasks?view=assigned). */
export interface AssignedTask {
  id: string;
  title: string;
  /** The assignee's own due date: the task's, or a later one after an extension. */
  dueOn: string;
  createdBy: PersonRef;
  myStatus: AssignmentStatus;
  urgent: boolean;
  /** The sender's estimate for one person, in minutes; null when none was given. */
  estimatedMinutes: number | null;
}

/** A row in the sender's list (GET /api/tasks?view=sent). */
export interface SentTask {
  id: string;
  title: string;
  dueOn: string;
  createdAt: string;
  assigneeCount: number;
  doneCount: number;
  /** When it reaches the assignees; deliveredAt is null while it is held. */
  deliverAt: string;
  deliveredAt: string | null;
  urgent: boolean;
  /** The sender was warned that at least one assignee does not have the time by the due date, and sent it anyway. */
  deadlineFlagged: boolean;
  /** Requests for more time on this task that are waiting for the sender's answer. */
  pendingExtensions: number;
}

export interface TaskAssignee extends PersonRef {
  status: AssignmentStatus;
  completedAt: string | null;
  /** This person's due date: the task's, or a later one after an extension. */
  dueOn: string;
}

export interface TaskComment {
  id: string;
  author: PersonRef;
  body: string;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  action: string;
  actor: PersonRef | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * GET /api/tasks/:id. The sender sees every assignee's progress and the activity log; an assignee sees only their own
 * status and the overall count, so the task view never becomes a way to watch colleagues.
 */
export interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  dueOn: string;
  createdAt: string;
  createdBy: PersonRef;
  deliverAt: string;
  deliveredAt: string | null;
  urgent: boolean;
  urgentReason: string | null;
  /** The sender's estimate for one person, in minutes; null when none was given. */
  estimatedMinutes: number | null;
  /** The sender was warned that at least one assignee does not have the time by the due date, and sent it anyway. */
  deadlineFlagged: boolean;
  /** The school's zone, for showing deliverAt in school time. */
  timeZone: string;
  isSender: boolean;
  myStatus: AssignmentStatus | null;
  /** The caller's own due date when they are an assignee; later than dueOn after an extension. */
  myDueOn: string | null;
  /** The caller's own answer to the completion question; null when not asked or not answered. */
  myTimeTaken: TimeTaken | null;
  /** Requests for more time and their answers: all of them for the sender, only their own for an assignee. */
  extensions: ExtensionRequest[];
  assigneeCount: number;
  doneCount: number;
  assignees: TaskAssignee[] | null;
  activity: TaskActivity[] | null;
  comments: TaskComment[];
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueOn: string;
  assigneeIds: string[];
  /** Deliver now even outside working hours. Needs a reason, which is recorded. */
  urgent?: boolean;
  urgentReason?: string;
  /** A task type supplies its usual estimate; estimatedMinutes, when given, is used instead. */
  taskTypeId?: string;
  estimatedMinutes?: number;
}
