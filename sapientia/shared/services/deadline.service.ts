/** Thrown by withDeadline when the call has not settled in time. Counts as temporary, so withRetry tries again. */
export class DeadlineError extends Error {
  constructor(readonly ms: number) {
    super(`No answer within ${ms} ms.`);
    this.name = 'DeadlineError';
  }
}

/**
 * Rejects with DeadlineError if the call takes longer than ms (plan Sprint 5: every external call has a timeout). The
 * libraries' own socket timeouts close the connection; this is the outer limit on the whole call, which they do not give.
 */
export async function withDeadline<T>(call: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DeadlineError(ms)), ms);
  });
  try {
    return await Promise.race([call, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
