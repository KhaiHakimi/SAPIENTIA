import { describe, expect, it, vi } from 'vitest';
import { DeadlineError, withDeadline, withRetry } from './external-call.service';

const options = (sleeps: number[], shouldRetry = () => true) => ({
  attempts: 4,
  baseDelayMs: 100,
  maxDelayMs: 300,
  shouldRetry,
  sleep: async (ms: number) => {
    sleeps.push(ms);
  },
  random: () => 1,
});

describe('withRetry', () => {
  it('returns the first success without waiting', async () => {
    const sleeps: number[] = [];
    expect(await withRetry(async () => 'ok', options(sleeps))).toBe('ok');
    expect(sleeps).toEqual([]);
  });

  it('backs off exponentially up to the ceiling, then succeeds', async () => {
    const sleeps: number[] = [];
    const operation = vi.fn(async (attempt: number) => {
      if (attempt < 4) throw new Error('temporary');
      return attempt;
    });
    expect(await withRetry(operation, options(sleeps))).toBe(4);
    expect(sleeps).toEqual([100, 200, 300]);
  });

  it('never waits less than half the backoff', async () => {
    const sleeps: number[] = [];
    await withRetry(async (attempt) => {
      if (attempt === 1) throw new Error('temporary');
    }, { ...options(sleeps), random: () => 0 });
    expect(sleeps).toEqual([50]);
  });

  it('rethrows the last error once the attempts run out', async () => {
    const sleeps: number[] = [];
    const error = new Error('still down');
    await expect(withRetry(async () => {
      throw error;
    }, options(sleeps))).rejects.toBe(error);
    expect(sleeps).toHaveLength(3);
  });

  it('does not retry a permanent failure', async () => {
    const sleeps: number[] = [];
    const operation = vi.fn(async () => {
      throw new Error('refused');
    });
    await expect(withRetry(operation, options(sleeps, () => false))).rejects.toThrow('refused');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('withDeadline', () => {
  it('passes a timely result through', async () => {
    expect(await withDeadline(Promise.resolve(5), 1_000)).toBe(5);
  });

  it('rejects a call that does not settle in time', async () => {
    vi.useFakeTimers();
    try {
      const pending = withDeadline(new Promise(() => undefined), 2_000);
      const assertion = expect(pending).rejects.toBeInstanceOf(DeadlineError);
      await vi.advanceTimersByTimeAsync(2_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
