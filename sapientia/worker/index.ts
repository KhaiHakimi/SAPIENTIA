/**
 * Background worker (plan D1, Sprint 4): a separate long-running process beside the web app. It delivers held tasks when
 * their job comes due, sweeps every minute for anything due whose job went missing, and sends the notifications (Sprint 5;
 * extension and relief messages from Phase 2) and the weekly digest (Phase 6), and removes expired sign-in rows every hour.
 * Run with `npm run worker`.
 */
import { PgBoss } from 'pg-boss';
import {
  DELIVER_DUE_QUEUE, DELIVER_TASK_QUEUE, type DeliverTaskJob, NOTIFY_EVENT_QUEUE, NOTIFY_TASK_QUEUE, type NotifyTaskJob,
} from '@/features/delivery/constants/queue.constants';
import { DIGEST_SWEEP_QUEUE } from '@/features/digest/constants/digest.constants';
import { sendWeeklyDigests } from '@/features/digest/server/digest.service';
import { EXPIRED_ROWS_SWEEP_QUEUE } from '@/features/housekeeping/constants/housekeeping.constants';
import { deleteExpiredRows } from '@/features/housekeeping/server/expired-rows.service';
import { closeQueue, ensureQueues } from '@/features/delivery/server/delivery-queue.service';
import { deliverDueTasks, deliverTask } from '@/features/delivery/server/delivery.service';
import type { NotificationSenders } from '@/features/notifications/interfaces/notification.interface';
import { createEmailSender } from '@/features/notifications/server/email.sender';
import { readAppOrigin, readEmailConfig, readPushConfig } from '@/features/notifications/server/notification-config.service';
import { eventNoticeJobSchema } from '@/features/notifications/schemas/event-notice.schemas';
import { notifyEvent } from '@/features/notifications/server/notify-event.service';
import { notifyTaskDelivered } from '@/features/notifications/server/notify-task.service';
import { createPushSender } from '@/features/notifications/server/push.sender';
import { systemClock } from '@/shared/server/clock.service';
import { closePool, readDatabaseUrl } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import { runWorker } from '@/shared/server/worker-lifecycle.service';

const SHUTDOWN_TIMEOUT_MS = 15_000;

/** Set once start-up has created it, so stopping knows whether there is anything to stop. */
let boss: PgBoss | null = null;

async function start(): Promise<void> {
  boss = new PgBoss({ connectionString: readDatabaseUrl() });
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
  // Extension requests and answers, relief given and taken back. A job of the wrong shape is logged and dropped: retrying
  // it would never help.
  await boss.work<unknown>(NOTIFY_EVENT_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const parsed = eventNoticeJobSchema.safeParse(job.data);
      if (!parsed.success) {
        logger.error('worker.bad_event_job', { jobId: job.id });
        continue;
      }
      const result = await notifyEvent(parsed.data, systemClock, senders, appOrigin);
      if (result.failed > 0) throw new Error(`${result.failed} notification(s) not sent yet; retrying later.`);
    }
  });

  // The Monday-morning digest (Phase 6): each sweep sends whatever has come due and is not yet recorded for the week.
  await boss.work(DIGEST_SWEEP_QUEUE, async () => {
    await sendWeeklyDigests(systemClock, senders.email, appOrigin);
  });

  // Hourly: expired sessions, two-step challenges, idempotency keys and sign-in throttle rows.
  await boss.work(EXPIRED_ROWS_SWEEP_QUEUE, async () => {
    await deleteExpiredRows(systemClock);
  });

  // Anything that came due while the worker was stopped goes out now rather than at the next sweep.
  const caughtUp = await deliverDueTasks(systemClock);
  logger.info('worker.started', { caughtUp });
}

/**
 * Closes everything start-up may have opened, each step even if an earlier one failed, so a half-started worker still
 * ends. The sender instance queues notify jobs from inside deliveries; it is stopped too or the process stays alive.
 */
async function stop(): Promise<void> {
  const steps = [() => boss?.stop({ graceful: true, timeout: SHUTDOWN_TIMEOUT_MS }), closeQueue, closePool];
  const failures: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) throw failures[0];
}

/** A channel without its environment variables is off, and the log says so once at start. */
function buildSenders(): NotificationSenders {
  const email = readEmailConfig();
  const push = readPushConfig();
  if (!email) logger.warn('worker.email_off', { detail: 'SMTP_URL or MAIL_FROM not set' });
  if (!push) logger.warn('worker.push_off', { detail: 'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY or VAPID_SUBJECT not set' });
  return { email: email && createEmailSender(email), push: push && createPushSender(push) };
}

void runWorker({ start, stop }, {
  onSignal: (signal, handler) => process.once(signal, handler),
  exit: (code) => process.exit(code),
});
