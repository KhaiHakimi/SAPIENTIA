import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { readJson, withApi } from './api-handler';
import { NotFoundError, ValidationError } from './app-errors';
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

describe('readJson', () => {
  const schema = z.strictObject({ name: z.string() });

  /** A body that never ends, as a client could send: it counts the bytes handed out and notes being cancelled. */
  function endlessBody() {
    const state = { sent: 0, cancelled: false };
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        state.sent += 16 * 1024;
        controller.enqueue(new Uint8Array(16 * 1024).fill(0x20));
      },
      cancel() {
        state.cancelled = true;
      },
    });
    return { stream, state };
  }

  const post = (body: BodyInit, headers: Record<string, string> = {}) => new Request('http://localhost:3000/api/thing', {
    method: 'POST', body, headers: { 'content-type': 'application/json', ...headers }, duplex: 'half',
  } as RequestInit);

  const refusal = (promise: Promise<unknown>) => promise.then(
    () => null,
    (error: unknown) => (error instanceof ValidationError ? error.fields : error),
  );

  it('reads a body within the limit', async () => {
    expect(await readJson(post(JSON.stringify({ name: 'Aminah' })), schema)).toEqual({ name: 'Aminah' });
  });

  it('refuses a declared length over 64 KB without reading the body', async () => {
    const { stream, state } = endlessBody();
    expect(await refusal(readJson(post(stream, { 'content-length': String(64 * 1024 + 1) }), schema))).toEqual({ body: 'too_large' });
    expect(state.sent).toBeLessThanOrEqual(16 * 1024);
  });

  it('stops reading a body with no length once it passes 64 KB, and cancels it', async () => {
    const { stream, state } = endlessBody();
    expect(await refusal(readJson(post(stream), schema))).toEqual({ body: 'too_large' });
    expect(state.cancelled).toBe(true);
    expect(state.sent).toBeLessThanOrEqual(64 * 1024 + 2 * 16 * 1024);
  });
});
