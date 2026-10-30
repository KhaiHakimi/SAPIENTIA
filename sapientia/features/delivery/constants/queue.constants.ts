/** pg-boss queue for one held task: a job per task, due at its deliver_at. */
export const DELIVER_TASK_QUEUE = 'deliver-task';
/** pg-boss cron queue for the safety-net sweep that delivers anything due whose job went missing. */
export const DELIVER_DUE_QUEUE = 'deliver-due-tasks';
export const DELIVER_DUE_CRON = '* * * * *';

export interface DeliverTaskJob {
  taskId: string;
}
