import 'server-only';
import { PgBoss } from 'pg-boss';
import type { PoolClient } from 'pg';
import { readDatabaseUrl } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import {
  DELIVER_DUE_CRON, DELIVER_DUE_QUEUE, DELIVER_TASK_QUEUE, type DeliverTaskJob, NOTIFY_TASK_QUEUE, type NotifyTaskJob,
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
  await boss.schedule(DELIVER_DUE_QUEUE, DELIVER_DUE_CRON);
}

/** Stops the web process's sender (tests and shutdown). */
export async function closeQueue(): Promise<void> {
  const boss = globalForBoss.sapientiaBoss;
  globalForBoss.sapientiaBoss = undefined;
  if (boss) await (await boss).stop({ graceful: false });
}
