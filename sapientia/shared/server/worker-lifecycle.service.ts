import type { ProcessHooks, StopSignal, WorkerLifecycle } from '../interfaces/worker-lifecycle.interface';
import { logger } from './logger.service';

const STOP_SIGNALS: readonly StopSignal[] = ['SIGINT', 'SIGTERM'];

/**
 * Runs a worker to completion. The signal handlers go in before anything starts, so a stop request during start-up is
 * honoured. A start that fails stops whatever had already opened and exits with code 1: a worker left half started would
 * stay alive doing nothing, and a supervisor would never restart it. Stopping happens once however often it is asked for.
 */
export async function runWorker(worker: WorkerLifecycle, hooks: ProcessHooks): Promise<void> {
  let stopping: Promise<boolean> | null = null;
  const stop = (): Promise<boolean> => {
    stopping ??= worker.stop().then(() => true, (error: unknown) => {
      logger.error('worker.stop_failed', { error });
      return false;
    });
    return stopping;
  };

  for (const signal of STOP_SIGNALS) {
    hooks.onSignal(signal, () => {
      logger.info('worker.stopping', { signal });
      // A clean stop leaves nothing open, so the process ends by itself; a failed one might not, so it is ended here.
      void stop().then((stopped) => {
        if (!stopped) hooks.exit(1);
      });
    });
  }

  try {
    await worker.start();
  } catch (error) {
    logger.error('worker.start_failed', { error });
    await stop();
    hooks.exit(1);
  }
}
