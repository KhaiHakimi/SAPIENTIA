/**
 * Background worker (plan D1, Sprint 4): a separate long-running process beside the web app. It delivers held tasks when
 * their job comes due and sweeps every minute for anything due whose job went missing. Run with `npm run worker`.
 */
import { PgBoss } from 'pg-boss';
import {
  DELIVER_DUE_QUEUE, DELIVER_TASK_QUEUE, type DeliverTaskJob,
} from '@/features/delivery/constants/queue.constants';
import { ensureQueues } from '@/features/delivery/server/delivery-queue.service';
import { deliverDueTasks, deliverTask } from '@/features/delivery/server/delivery.service';
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

  // Anything that came due while the worker was stopped goes out now rather than at the next sweep.
  const caughtUp = await deliverDueTasks(systemClock);
  logger.info('worker.started', { caughtUp });

  const shutdown = async (signal: string) => {
    logger.info('worker.stopping', { signal });
    try {
      await boss.stop({ graceful: true, timeout: SHUTDOWN_TIMEOUT_MS });
      await closePool();
    } catch (error) {
      logger.error('worker.stop_failed', { error });
      process.exitCode = 1;
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  logger.error('worker.start_failed', { error });
  process.exitCode = 1;
});
