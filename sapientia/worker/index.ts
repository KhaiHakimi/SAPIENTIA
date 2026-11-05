/**
 * Background worker (plan D1, Sprint 4): a separate long-running process beside the web app. It delivers held tasks when
 * their job comes due and sweeps every minute for anything due whose job went missing. Run with `npm run worker`.
 */
import { PgBoss } from 'pg-boss';
import {
  DELIVER_DUE_QUEUE, DELIVER_TASK_QUEUE, type DeliverTaskJob, NOTIFY_TASK_QUEUE, type NotifyTaskJob,
} from '@/features/delivery/constants/queue.constants';
import { closeQueue, ensureQueues } from '@/features/delivery/server/delivery-queue.service';
import { deliverDueTasks, deliverTask } from '@/features/delivery/server/delivery.service';
import type { NotificationSenders } from '@/features/notifications/interfaces/notification.interface';
import { createEmailSender } from '@/features/notifications/server/email.sender';
import { readAppOrigin, readEmailConfig, readPushConfig } from '@/features/notifications/server/notification-config.service';
import { notifyTaskDelivered } from '@/features/notifications/server/notify-task.service';
import { createPushSender } from '@/features/notifications/server/push.sender';
import { systemClock } from '@/shared/server/clock.service';
import { closePool, readDatabaseUrl } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';

const SHUTDOWN_TIMEOUT_MS = 15_000;

async function main(): Promise<void> {
  const boss = new PgBoss({ connectionString: readDatabaseUrl() });
  boss.on('error', (error: Error) => logger.error('worker.queue_error', { error }));
  await boss.start();
  await ensureQueues(boss);

  // A job that throws is retried by pg-boss with backoff (queue options); delivery itself is idempotent.
  await boss.work<DeliverTaskJob>(DELIVER_TASK_QUEUE, async (jobs) => {
    for (const job of jobs) await deliverTask(job.data.taskId, systemClock);
  });
  await boss.work(DELIVER_DUE_QUEUE, async () => {
    await deliverDueTasks(systemClock);
  });

  // Each send has its own timeout and short retries; if any still failed for a temporary reason, the job throws and
  // pg-boss runs it again later with backoff. Messages that already went out are recorded and not sent twice.
  const senders = buildSenders();
  const appOrigin = readAppOrigin();
  await boss.work<NotifyTaskJob>(NOTIFY_TASK_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const result = await notifyTaskDelivered(job.data.taskId, systemClock, senders, appOrigin);
      if (result.failed > 0) throw new Error(`${result.failed} notification(s) not sent yet; retrying later.`);
    }
  });

  // Anything that came due while the worker was stopped goes out now rather than at the next sweep.
  const caughtUp = await deliverDueTasks(systemClock);
  logger.info('worker.started', { caughtUp });

  const shutdown = async (signal: string) => {
    logger.info('worker.stopping', { signal });
    try {
      await boss.stop({ graceful: true, timeout: SHUTDOWN_TIMEOUT_MS });
      // The sender instance queues notify jobs from inside deliveries; stop it too or the process stays alive.
      await closeQueue();
      await closePool();
    } catch (error) {
      logger.error('worker.stop_failed', { error });
      process.exitCode = 1;
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

/** A channel without its environment variables is off, and the log says so once at start. */
function buildSenders(): NotificationSenders {
  const email = readEmailConfig();
  const push = readPushConfig();
  if (!email) logger.warn('worker.email_off', { detail: 'SMTP_URL or MAIL_FROM not set' });
  if (!push) logger.warn('worker.push_off', { detail: 'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY or VAPID_SUBJECT not set' });
  return { email: email && createEmailSender(email), push: push && createPushSender(push) };
}

main().catch((error: unknown) => {
  logger.error('worker.start_failed', { error });
  process.exitCode = 1;
});
