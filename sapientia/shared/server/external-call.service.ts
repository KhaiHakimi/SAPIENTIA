import type { RetryOptions } from '@/shared/interfaces/retry.interface';

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs operation, and on a failure that shouldRetry accepts, waits and runs it again: exponential backoff with jitter,
 * so many workers retrying the same service do not hit it in step. The last error is rethrown unchanged.
 */
export async function withRetry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? realSleep;
  const random = options.random ?? Math.random;
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= options.attempts || !options.shouldRetry(error)) throw error;
      const ceiling = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (attempt - 1));
      // "Equal jitter": at least half the backoff, so a retry never fires immediately.
      await sleep(Math.round(ceiling / 2 + (random() * ceiling) / 2));
    }
  }
}
