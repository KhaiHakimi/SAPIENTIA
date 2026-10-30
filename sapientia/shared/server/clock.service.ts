import type { Clock } from '@/shared/interfaces/clock.interface';

export const systemClock: Clock = { now: () => new Date() };

/** A clock stopped at one instant, for tests. */
export function fixedClock(at: Date | string): Clock {
  const instant = new Date(at);
  return { now: () => new Date(instant) };
}

let testClock: Clock | null = null;

/** The clock route handlers pass to services: the real one, unless a test has set its own. */
export function appClock(): Clock {
  return testClock ?? systemClock;
}

/**
 * Lets integration tests call route handlers at a chosen time (10 pm on a Friday, say). Refused outside the test runner,
 * so production can never run on a fake clock.
 */
export function setTestClock(clock: Clock | null): void {
  if (process.env.NODE_ENV !== 'test') throw new Error('setTestClock is for tests only.');
  testClock = clock;
}
