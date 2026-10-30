import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkHealth } from './health.service';

describe('health check', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports ok when the database answers', async () => {
    await expect(checkHealth(async () => {})).resolves.toEqual({ status: 'ok', checks: { database: 'up' } });
  });

  it('reports unavailable, without the error text, when the database refuses', async () => {
    const report = await checkHealth(() => Promise.reject(new Error('password authentication failed for user "x"')));
    expect(report).toEqual({ status: 'unavailable', checks: { database: 'down' } });
    expect(JSON.stringify(report)).not.toContain('password');
  });

  it('gives up on a database that never answers', async () => {
    vi.useFakeTimers();
    const pending = checkHealth(() => new Promise(() => {}), 1_000);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toEqual({ status: 'unavailable', checks: { database: 'down' } });
  });
});
