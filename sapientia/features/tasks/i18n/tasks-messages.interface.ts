import type { AssignmentStatus } from '../interfaces/task.interface';

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
  // Detail
  back: string;
  sentBy: (name: string, when: string) => string;
  noDescription: string;
  urgentBecause: (reason: string) => string;
  myStatus: string;
  statusSaved: string;
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
    other: (actor: string, action: string) => string;
  };
  someone: string;
  // Field errors specific to tasks
  fieldErrors: Record<string, string>;
}
