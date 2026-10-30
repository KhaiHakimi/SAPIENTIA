export type AssignmentStatus = 'todo' | 'in_progress' | 'waiting' | 'done';

export interface PersonRef {
  id: string;
  name: string;
}

/** A card on the assignee's board (GET /api/tasks?view=assigned). */
export interface AssignedTask {
  id: string;
  title: string;
  dueOn: string;
  createdBy: PersonRef;
  myStatus: AssignmentStatus;
  urgent: boolean;
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
}

export interface TaskAssignee extends PersonRef {
  status: AssignmentStatus;
  completedAt: string | null;
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
  /** The school's zone, for showing deliverAt in school time. */
  timeZone: string;
  isSender: boolean;
  myStatus: AssignmentStatus | null;
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
}
