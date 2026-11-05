import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { getPool } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import type { NotificationSenders, NotifyResult, TaskNotice } from '../interfaces/notification.interface';
import { buildTaskEmail, buildTaskPush, taskPath } from '../services/notification-content';
import {
  deleteSubscriptionById, findDeliveredTask, listRecipients, listSentKeys, listSubscriptions, recordSent, type RecipientRow,
} from './notifications.repository';
import { SendFailure } from './send-failure';

/**
 * Tells each assignee that a delivered task has reached them: email if they keep it on, and push to every device they
 * subscribed. Run by the worker's notify job, which is queued in the same transaction that delivers the task (plan Sprint
 * 5), so nothing is sent for a held task. Each send is recorded once done, so when the job is retried after a temporary
 * failure only the missing messages go out. No database transaction is held open while waiting on outside services.
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
  const recipients = await listRecipients(db, task.school_id, taskId);
  const [sentKeys, subscriptions] = await Promise.all([
    listSentKeys(db, task.school_id, taskId),
    senders.push ? listSubscriptions(db, task.school_id, recipients.map((recipient) => recipient.user_id)) : [],
  ]);
  const result: NotifyResult = { sent: 0, failed: 0 };

  const attempt = async (key: string, send: () => Promise<void>, record: () => Promise<void>, onGone?: () => Promise<void>) => {
    if (sentKeys.has(key)) return;
    try {
      await send();
      await record();
      result.sent++;
    } catch (error) {
      if (!(error instanceof SendFailure)) throw error;
      logger.warn('notify.send_failed', { taskId, kind: error.kind, status: error.status, detail: error.message });
      if (error.kind === 'gone' && onGone) await onGone();
      if (error.kind === 'temporary') result.failed++;
    }
  };

  for (const recipient of recipients) {
    const notice = toNotice(task, recipient, appOrigin);
    const sentRow = (channel: 'email' | 'push', target: string) => () =>
      recordSent(db, task.school_id, { taskId, userId: recipient.user_id, channel, target, at: clock.now() });

    if (senders.email && recipient.notify_by_email) {
      const email = senders.email;
      await attempt(`${recipient.user_id}|email|email`, () => email.send(buildTaskEmail(notice, recipient.email)), sentRow('email', 'email'));
    }
    if (senders.push) {
      const push = senders.push;
      for (const device of subscriptions.filter((subscription) => subscription.user_id === recipient.user_id)) {
        await attempt(
          `${recipient.user_id}|push|${device.id}`,
          () => push.send({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, buildTaskPush(notice)),
          sentRow('push', device.id),
          () => deleteSubscriptionById(db, task.school_id, device.id),
        );
      }
    }
  }
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
