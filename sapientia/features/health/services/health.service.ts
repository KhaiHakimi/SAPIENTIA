import type { HealthReport } from '../interfaces/health-report.interface';

/** Long enough for a cold pool to connect, short enough that a load balancer's probe does not hang. */
export const HEALTH_TIMEOUT_MS = 4_000;

/** Runs the database probe with a time limit. Never throws: any failure becomes a 'down' check, with the reason logged here. */
export async function checkHealth(pingDatabase: () => Promise<void>, timeoutMs = HEALTH_TIMEOUT_MS): Promise<HealthReport> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`database check timed out after ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    await Promise.race([pingDatabase(), timeout]);
    return { status: 'ok', checks: { database: 'up' } };
  } catch (error) {
    console.error('[health] database check failed:', describeError(error));
    return { status: 'unavailable', checks: { database: 'down' } };
  } finally {
    clearTimeout(timer);
  }
}

/** A refused connection arrives as an AggregateError with an empty message, so fall back to its code and name. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error as NodeJS.ErrnoException).code;
  return [error.name, code, error.message].filter(Boolean).join(': ');
}
