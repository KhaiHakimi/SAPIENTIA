import type { Feasibility } from '@/features/capacity/interfaces/capacity.interface';

/** approved: the sender accepted the date asked for. countered: the sender set a different date instead. */
export type ExtensionStatus = 'pending' | 'approved' | 'countered';

/** One request for more time, and its answer once given. Part of GET /api/tasks/:id. */
export interface ExtensionRequest {
  id: string;
  requestedBy: { id: string; name: string };
  /** The assignee's due date when they asked. */
  currentDueOn: string;
  requestedDueOn: string;
  reason: string | null;
  /**
   * What the capacity check said when they asked: the task's estimate and the free working time they had left before the
   * due date. Totals only. Both null when the task has no estimate.
   */
  neededMinutes: number | null;
  freeMinutes: number | null;
  status: ExtensionStatus;
  decidedBy: { id: string; name: string } | null;
  decidedAt: string | null;
  /** The date granted: the requested date when approved, the sender's own when countered. */
  decidedDueOn: string | null;
  createdAt: string;
}

/** POST /api/tasks/:id/extension-requests. */
export interface NewExtensionRequest {
  requestedDueOn: string;
  reason?: string;
}

/** PATCH /api/tasks/:id/extension-requests/:requestId. */
export type ExtensionDecision = { decision: 'approve' } | { decision: 'propose'; dueOn: string };

/**
 * GET /api/tasks/:id/extension-suggestion: the assignee's own figures for this task, to fill in the request. feasibility is
 * null when the task has no estimate, because there is then nothing to work a date out from.
 */
export interface ExtensionSuggestion {
  dueOn: string;
  feasibility: Feasibility | null;
}
