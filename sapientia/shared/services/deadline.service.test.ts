import { describe, expect, it, vi } from 'vitest';
import { DeadlineError, withDeadline } from './deadline.service';

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
