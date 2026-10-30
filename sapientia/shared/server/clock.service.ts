import type { Clock } from '@/shared/interfaces/clock.interface';

export const systemClock: Clock = { now: () => new Date() };

/** A clock stopped at one instant, for tests. */
export function fixedClock(at: Date | string): Clock {
  const instant = new Date(at);
  return { now: () => new Date(instant) };
}
