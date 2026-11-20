export interface RetryOptions {
  /** Total tries, including the first. */
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Only temporary failures are worth another try; a permanent refusal fails at once. */
  shouldRetry: (error: unknown) => boolean;
  /** Injected by tests so they do not wait. */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}
