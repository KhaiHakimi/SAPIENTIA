/** A long-running background process: start it, and stop it so nothing keeps the process alive. */
export interface WorkerLifecycle {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export type StopSignal = 'SIGINT' | 'SIGTERM';

/** The parts of `process` the worker needs, injected so tests can drive them. */
export interface ProcessHooks {
  onSignal: (signal: StopSignal, handler: () => void) => void;
  exit: (code: number) => void;
}
