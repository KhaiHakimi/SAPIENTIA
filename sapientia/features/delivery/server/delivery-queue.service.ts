import 'server-only';
import { PgBoss } from 'pg-boss';
import type { PoolClient } from 'pg';
import { readDatabaseUrl } from '@/shared/server/database.service';
import { DIGEST_SWEEP_CRON, DIGEST_SWEEP_QUEUE } from '@/features/digest/constants/digest.constants';
import { EXPIRED_ROWS_SWEEP_CRON, EXPIRED_ROWS_SWEEP_QUEUE } from '@/features/housekeeping/constants/housekeeping.constants';
import type { EventNoticeJob } from '@/features/notifications/interfaces/event-notice.interface';
import { logger } from '@/shared/server/logger.service';
import {
  DELIVER_DUE_CRON, DELIVER_DUE_QUEUE, DELIVER_TASK_QUEUE, type DeliverTaskJob, NOTIFY_EVENT_QUEUE, NOTIFY_TASK_QUEUE,
  type NotifyTaskJob,
} from '../constants/queue.constants';

/**
 * The web process only adds jobs; the worker (worker/index.ts) runs them. This instance does no maintenance, scheduling
 * or migration, and expects the pg-boss schema to exist already (npm run db:migrate installs it).
 */
const globalForBoss = globalThis as typeof globalThis & { sapientiaBoss?: Promise<PgBoss> };

function senderBoss(): Promise<PgBoss> {
  globalForBoss.sapientiaBoss ??= (async () => {
    const boss = new PgBoss({ connectionString: readDatabaseUrl(), supervise: false, schedule: false, migrate: false, max: 2 });
    boss.on('error', (error: Error) => logger.error('queue.error', { error }));
    await boss.start();
    return boss;
  })().catch((error: unknown) => {
    globalForBoss.sapientiaBoss = undefined;
    throw error;
  });
  return globalForBoss.sapientiaBoss;
}

/**
 * Adds the delivery job inside the caller's transaction, so the task and its job are saved together or not at all. The
 * queue's 'short' policy keeps one queued job per task (singletonKey = task id).
 */
export async function scheduleDelivery(client: PoolClient, taskId: string, deliverAt: Date): Promise<void> {
  const boss = await senderBoss();
  const job: DeliverTaskJob = { taskId };
  await boss.send(DELIVER_TASK_QUEUE, job, { startAfter: deliverAt, singletonKey: taskId, db: inTransaction(client) });
}

/**
 * Queues "this task has reached you" in the transaction that sets delivered_at, so the message exists exactly when the
 * delivery does (plan Sprint 5: notifications only after the conditional update succeeds). One job per task.
 */
export async function queueDeliveryNotice(client: PoolClient, taskId: string): Promise<void> {
  const boss = await senderBoss();
  const job: NotifyTaskJob = { taskId };
  await boss.send(NOTIFY_TASK_QUEUE, job, { singletonKey: taskId, db: inTransaction(client) });
}

/**
 * queueDeliveryNotice for many tasks in one statement, for the sweep. insert() takes the queue's own retry settings and,
 * like send(), skips a task that already has a job queued, since each job keeps the task id as its singletonKey.
 */
export async function queueDeliveryNotices(client: PoolClient, taskIds: readonly string[]): Promise<void> {
  if (taskIds.length === 0) return;
  const boss = await senderBoss();
  const jobs = taskIds.map((taskId) => ({ data: { taskId } satisfies NotifyTaskJob, singletonKey: taskId }));
  await boss.insert(NOTIFY_TASK_QUEUE, jobs, { db: inTransaction(client) });
}

/**
 * Queues a message about an extension request or relief inside the transaction that saves the event, to run no earlier
 * than startAfter. singletonKey is the notice key, so one event queues one job.
 */
export async function queueEventNoticeJob(client: PoolClient, job: EventNoticeJob, noticeKey: string, startAfter: Date): Promise<void> {
  const boss = await senderBoss();
  await boss.send(NOTIFY_EVENT_QUEUE, job, { startAfter, singletonKey: noticeKey, db: inTransaction(client) });
}

const inTransaction = (client: PoolClient) => ({ executeSql: (text: string, values?: unknown[]) => client.query(text, values) });

/** Creates the pg-boss schema and queues. Run by `npm run db:migrate` and at worker start; safe to run again. */
export async function installQueues(): Promise<void> {
  const boss = new PgBoss({ connectionString: readDatabaseUrl(), supervise: false, schedule: false });
  boss.on('error', (error: Error) => logger.error('queue.error', { error }));
  await boss.start();
  try {
    await ensureQueues(boss);
  } finally {
    await boss.stop({ graceful: false });
  }
}

export async function ensureQueues(boss: PgBoss): Promise<void> {
  const existing = new Set((await boss.getQueues()).map((queue) => queue.name));
  if (!existing.has(DELIVER_TASK_QUEUE)) {
    await boss.createQueue(DELIVER_TASK_QUEUE, { policy: 'short', retryLimit: 5, retryDelay: 30, retryBackoff: true });
  }
  if (!existing.has(DELIVER_DUE_QUEUE)) await boss.createQueue(DELIVER_DUE_QUEUE, { policy: 'short', retryLimit: 0 });
  // Email or push services can be down for a while: retry over roughly an hour (1, 2, 4 ... 32 minutes).
  if (!existing.has(NOTIFY_TASK_QUEUE)) {
    await boss.createQueue(NOTIFY_TASK_QUEUE, { policy: 'short', retryLimit: 6, retryDelay: 60, retryBackoff: true });
  }
  if (!existing.has(NOTIFY_EVENT_QUEUE)) {
    await boss.createQueue(NOTIFY_EVENT_QUEUE, { policy: 'short', retryLimit: 6, retryDelay: 60, retryBackoff: true });
  }
  // The weekly digest sweep (Phase 6): a missed run is simply caught by the next one, so no retries.
  if (!existing.has(DIGEST_SWEEP_QUEUE)) await boss.createQueue(DIGEST_SWEEP_QUEUE, { policy: 'short', retryLimit: 0 });
  // Removing expired sign-in rows: likewise, the next hourly run takes whatever one missed.
  if (!existing.has(EXPIRED_ROWS_SWEEP_QUEUE)) await boss.createQueue(EXPIRED_ROWS_SWEEP_QUEUE, { policy: 'short', retryLimit: 0 });
  await boss.schedule(DELIVER_DUE_QUEUE, DELIVER_DUE_CRON);
  await boss.schedule(DIGEST_SWEEP_QUEUE, DIGEST_SWEEP_CRON);
  await boss.schedule(EXPIRED_ROWS_SWEEP_QUEUE, EXPIRED_ROWS_SWEEP_CRON);
}

/** Stops the web process's sender (tests and shutdown). */
export async function closeQueue(): Promise<void> {
  const boss = globalForBoss.sapientiaBoss;
  globalForBoss.sapientiaBoss = undefined;
  if (boss) await (await boss).stop({ graceful: false });
}
