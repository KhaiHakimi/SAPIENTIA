/** pg-boss queue for one held task: a job per task, due at its deliver_at. */
export const DELIVER_TASK_QUEUE = 'deliver-task';
/** pg-boss cron queue for the safety-net sweep that delivers anything due whose job went missing. */
export const DELIVER_DUE_QUEUE = 'deliver-due-tasks';
export const DELIVER_DUE_CRON = '* * * * *';

/** pg-boss queue that tells assignees a task has reached them. Queued in the transaction that delivers the task. */
export const NOTIFY_TASK_QUEUE = 'notify-task-delivered';

export interface DeliverTaskJob {
  taskId: string;
}

export interface NotifyTaskJob {
  taskId: string;
}
