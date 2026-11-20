import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import type { NotificationSenders, NotifyResult, OutgoingMessage, SendLedger } from '../interfaces/notification.interface';
import { deleteSubscriptionById, listSubscriptions, type RecipientRow } from './notifications.repository';
import { SendFailure } from './send-failure';

/**
 * Sends one message to each recipient: email if they keep it on, and push to every device they subscribed. Each send is
 * recorded in the ledger once done, so a job retried after a temporary failure sends only what is still missing. A device
 * the push service says is gone is forgotten. Errors other than a SendFailure are bugs and are thrown, not swallowed.
 */
export async function dispatchNotices(
  db: Queryable,
  schoolId: string,
  deliveries: readonly { recipient: RecipientRow; message: OutgoingMessage }[],
  senders: NotificationSenders,
  ledger: SendLedger,
  logContext: Record<string, string>,
): Promise<NotifyResult> {
  const subscriptions = senders.push
    ? await listSubscriptions(db, schoolId, deliveries.map((delivery) => delivery.recipient.user_id))
    : [];
  const result: NotifyResult = { sent: 0, failed: 0 };

  const attempt = async (key: string, send: () => Promise<void>, record: () => Promise<void>, onGone?: () => Promise<void>) => {
    if (ledger.sentKeys.has(key)) return;
    try {
      await send();
      await record();
      result.sent++;
    } catch (error) {
      if (!(error instanceof SendFailure)) throw error;
      logger.warn('notify.send_failed', { ...logContext, kind: error.kind, status: error.status, detail: error.message });
      if (error.kind === 'gone' && onGone) await onGone();
      if (error.kind === 'temporary') result.failed++;
    }
  };

  for (const { recipient, message } of deliveries) {
    const userId = recipient.user_id;
    if (senders.email && recipient.notify_by_email) {
      const email = senders.email;
      await attempt(`${userId}|email|email`, () => email.send(message.email(recipient.email)), () => ledger.record(userId, 'email', 'email'));
    }
    if (senders.push) {
      const push = senders.push;
      for (const device of subscriptions.filter((subscription) => subscription.user_id === userId)) {
        await attempt(
          `${userId}|push|${device.id}`,
          () => push.send({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, message.push),
          () => ledger.record(userId, 'push', device.id),
          () => deleteSubscriptionById(db, schoolId, device.id),
        );
      }
    }
  }
  return result;
}
