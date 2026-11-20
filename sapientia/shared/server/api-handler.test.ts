import { afterEach, describe, expect, it, vi } from 'vitest';
import { withApi } from './api-handler';
import { NotFoundError } from './app-errors';
import { logger } from './logger.service';

const get = (signal?: AbortSignal) => new Request('http://localhost:3000/api/thing', { signal });

describe('withApi', () => {
  afterEach(() => vi.restoreAllMocks());

  it('answers an expected failure with its status and code, logged as refused', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const response = await withApi(async () => {
      throw new NotFoundError();
    })(get(), {});
    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('not_found');
    expect(info).toHaveBeenCalledWith('api.refused', expect.objectContaining({ code: 'not_found' }));
  });

  it('hides an unexpected failure behind a 500 and logs it as an error', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const response = await withApi(async () => {
      throw new Error('boom');
    })(get(), {});
    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledWith('api.unexpected', expect.anything());
  });

  it('does not log a request the browser gave up on as a server error', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const controller = new AbortController();
    const response = await withApi(async () => {
      controller.abort();
      throw new Error('aborted');
    })(get(controller.signal), {});
    expect(response.status).toBe(499);
    expect(error).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith('api.client_aborted', expect.anything());
  });
});
