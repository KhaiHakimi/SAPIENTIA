import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ProcessHooks, StopSignal } from '../interfaces/worker-lifecycle.interface';
import { runWorker } from './worker-lifecycle.service';

vi.mock('./logger.service', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

describe('runWorker', () => {
  let handlers: Map<StopSignal, () => void>;
  let exit: Mock<(code: number) => void>;
  let hooks: ProcessHooks;

  beforeEach(() => {
    handlers = new Map();
    exit = vi.fn<(code: number) => void>();
    hooks = { onSignal: (signal, handler) => handlers.set(signal, handler), exit };
  });

  it('stops what had opened and exits with code 1 when start-up fails', async () => {
    const stop = vi.fn(async () => undefined);
    await runWorker({ start: async () => Promise.reject(new Error('database down')), stop }, hooks);
    expect(stop).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('listens for stop signals before start-up begins', async () => {
    let signalsAtStart: StopSignal[] = [];
    await runWorker({ start: async () => {
      signalsAtStart = [...handlers.keys()];
    }, stop: async () => undefined }, hooks);
    expect(signalsAtStart.sort()).toEqual(['SIGINT', 'SIGTERM']);
    expect(exit).not.toHaveBeenCalled();
  });

  it('stops once on a signal, and exits only when stopping fails', async () => {
    const stop = vi.fn(async () => undefined);
    await runWorker({ start: async () => undefined, stop }, hooks);
    handlers.get('SIGTERM')?.();
    handlers.get('SIGINT')?.();
    await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce());
    expect(exit).not.toHaveBeenCalled();

    const failing = vi.fn(async () => Promise.reject(new Error('stuck')));
    await runWorker({ start: async () => undefined, stop: failing }, hooks);
    handlers.get('SIGTERM')?.();
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
  });
});
