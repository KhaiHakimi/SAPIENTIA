/** POST /api/ai/task-draft body. */
export interface TaskDraftRequest {
  instruction: string;
}

/** A proposal for the create-task form. Every field passed the same rules as a real task; anything that did not is null. */
export interface TaskDraft {
  title: string;
  description: string | null;
  dueOn: string | null;
  estimatedMinutes: number | null;
}

export interface TaskDraftResult {
  draft: TaskDraft;
  /** How many names, emails or numbers were removed before the instruction left the server. */
  removed: number;
  /** Fields the model proposed that failed validation and were left out. */
  dropped: Array<'description' | 'dueOn' | 'estimatedMinutes'>;
}

/** GET /api/ai/status: which AI features this server has switched on. */
export interface AiStatus {
  taskDrafts: boolean;
}
