import type { AssignmentStatus, TimeTaken } from '../interfaces/task.interface';

export interface TasksMessages {
  statuses: Record<AssignmentStatus, string>;
  // Board
  boardTitle: string;
  boardIntro: string;
  columnEmpty: string;
  due: (day: string) => string;
  from: (name: string) => string;
  moveTo: string;
  moving: string;
  loadMore: string;
  loading: string;
  // Sent list
  sentTitle: string;
  sentIntro: string;
  sentEmpty: string;
  columns: { title: string; due: string; progress: string; created: string; delivery: string };
  heldTitle: string;
  heldIntro: string;
  heldEmpty: string;
  heldUntil: (when: string) => string;
  deliveredOn: (when: string) => string;
  urgentBadge: string;
  progress: (done: number, total: number) => string;
  newTask: string;
  // Create
  createTitle: string;
  createIntro: string;
  title: string;
  dueOn: string;
  assignees: string;
  assigneesHelp: string;
  filterStaff: string;
  noStaffMatch: string;
  selectedCount: (count: number) => string;
  /** Beside a name in the assignee list: that person's estimated unfinished work due by the end of this week. */
  workload: (duration: string) => string;
  workloadHelp: (weekEnd: string) => string;
  description: string;
  descriptionHelp: string;
  optional: string;
  send: string;
  sending: string;
  willDeliver: (when: string) => string;
  deliversNow: string;
  heldExplained: string;
  urgentLabel: string;
  urgentHelp: string;
  urgentReason: string;
  // Capacity (Phase 2)
  taskType: string;
  noTaskType: string;
  estimate: string;
  estimateHelp: string;
  estimateLine: (duration: string) => string;
  flaggedBadge: string;
  flaggedExplained: string;
  // Detail
  back: string;
  sentBy: (name: string, when: string) => string;
  noDescription: string;
  urgentBecause: (reason: string) => string;
  myStatus: string;
  statusSaved: string;
  /** The optional completion question, shown once the caller's own task is done. */
  timeTaken: { question: string; help: string; options: Record<TimeTaken, string>; saved: string };
  overall: string;
  assigneesTitle: string;
  completedAt: (when: string) => string;
  commentsTitle: string;
  commentsEmpty: string;
  commentLabel: string;
  commentSend: string;
  commentSending: string;
  activityTitle: string;
  activity: {
    created: (actor: string) => string;
    assigned: (actor: string, assignee: string) => string;
    statusChanged: (actor: string, from: string, to: string) => string;
    commented: (actor: string) => string;
    held: (actor: string, when: string) => string;
    urgent: (actor: string) => string;
    delivered: string;
    flagged: (actor: string, count: number) => string;
    extensionRequested: (actor: string, day: string) => string;
    extensionApproved: (actor: string, assignee: string, day: string) => string;
    extensionCountered: (actor: string, assignee: string, day: string) => string;
    other: (actor: string, action: string) => string;
  };
  someone: string;
  // Field errors specific to tasks
  fieldErrors: Record<string, string>;
}
