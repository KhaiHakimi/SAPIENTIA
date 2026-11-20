import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { getPool } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import type { NotificationSenders, NotifyResult, TaskNotice } from '../interfaces/notification.interface';
import { buildTaskEmail, buildTaskPush, taskPath } from '../services/notification-content';
import { dispatchNotices } from './notice-dispatch.service';
import { findDeliveredTask, listRecipients, listSentKeys, recordSent, type RecipientRow } from './notifications.repository';

/**
 * Tells each assignee that a delivered task has reached them. Run by the worker's notify job, which is queued in the same
 * transaction that delivers the task (plan Sprint 5), so nothing is sent for a held task. No database transaction is held
 * open while waiting on outside services.
 */
export async function notifyTaskDelivered(
  taskId: string,
  clock: Clock,
  senders: NotificationSenders,
  appOrigin: string | null,
): Promise<NotifyResult> {
  const db = getPool();
  const task = await findDeliveredTask(db, taskId);
  if (!task) {
    logger.warn('notify.task_not_deliverable', { taskId });
    return { sent: 0, failed: 0 };
  }
  const [recipients, sentKeys] = await Promise.all([listRecipients(db, task.school_id, taskId), listSentKeys(db, task.school_id, taskId)]);
  const deliveries = recipients.map((recipient) => {
    const notice = toNotice(task, recipient, appOrigin);
    return { recipient, message: { email: (to: string) => buildTaskEmail(notice, to), push: buildTaskPush(notice) } };
  });
  const result = await dispatchNotices(db, task.school_id, deliveries, senders, {
    sentKeys,
    record: (userId, channel, target) => recordSent(db, task.school_id, { taskId, userId, channel, target, at: clock.now() }),
  }, { taskId });
  logger.info('notify.done', { taskId, sent: result.sent, failed: result.failed });
  return result;
}

function toNotice(
  task: { id: string; title: string; due_on: string; sender_name: string },
  recipient: RecipientRow,
  appOrigin: string | null,
): TaskNotice {
  return {
    taskId: task.id,
    title: task.title,
    dueOn: task.due_on,
    senderName: task.sender_name,
    recipientName: recipient.name,
    link: appOrigin ? `${appOrigin}${taskPath(task.id)}` : null,
  };
}
