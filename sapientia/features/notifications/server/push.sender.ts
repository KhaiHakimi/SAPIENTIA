import 'server-only';
import webpush from 'web-push';
import { DeadlineError, withDeadline, withRetry } from '@/shared/server/external-call.service';
import { PUSH_TTL_SECONDS, SEND_DEADLINE_MS, SEND_RETRY, SOCKET_TIMEOUT_MS } from '../constants/notification.constants';
import type { PushConfig, PushPayload, PushSender, PushSubscriptionInput } from '../interfaces/notification.interface';
import { isAllowedPushEndpoint } from '../services/push-endpoint';
import { isTemporary, SendFailure } from './send-failure';

/** 404 and 410: the browser dropped the subscription. 429 and 5xx: busy, try later. Other 4xx: our request is wrong. */
function classify(error: unknown): SendFailure {
  if (error instanceof SendFailure) return error;
  if (error instanceof DeadlineError) return new SendFailure('temporary', 'push: no answer in time');
  const status = (error as { statusCode?: unknown })?.statusCode;
  if (typeof status !== 'number') return new SendFailure('temporary', 'push: connection failed');
  if (status === 404 || status === 410) return new SendFailure('gone', `push: subscription gone (${status})`, status);
  if (status === 429 || status >= 500) return new SendFailure('temporary', `push: service busy (${status})`, status);
  return new SendFailure('permanent', `push: refused (${status})`, status);
}

/** Web Push with VAPID. The keys are passed per call, so nothing global is set on the library. */
export function createPushSender(config: PushConfig): PushSender {
  const vapidDetails = { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey };
  return {
    async send(subscription: PushSubscriptionInput, payload: PushPayload): Promise<void> {
      // Checked when saved too; checked again here because the worker is what actually makes the request.
      if (!isAllowedPushEndpoint(subscription.endpoint)) throw new SendFailure('gone', 'push: endpoint not allowed');
      await withRetry(async () => {
        try {
          await withDeadline(
            webpush.sendNotification(subscription, JSON.stringify(payload), {
              vapidDetails, TTL: PUSH_TTL_SECONDS, urgency: 'normal', timeout: SOCKET_TIMEOUT_MS,
            }),
            SEND_DEADLINE_MS,
          );
        } catch (error) {
          throw classify(error);
        }
      }, { ...SEND_RETRY, shouldRetry: isTemporary });
    },
  };
}
