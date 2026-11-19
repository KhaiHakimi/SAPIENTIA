/** POST /api/tasks/similar body: the title being typed and the people chosen so far. */
export interface SimilarTasksRequest {
  title: string;
  assigneeIds: string[];
}

/** An open task that looks like the one being written. */
export interface SimilarTask {
  /** Only when the caller sent it, so the link opens; another sender's task cannot be opened by the caller. */
  taskId: string | null;
  title: string;
  dueOn: string;
  sentBy: { name: string; isMe: boolean };
  /** How many of the people chosen so far already have it. */
  sharedAssignees: number;
}

export interface SimilarTasksResult {
  items: SimilarTask[];
}
