/** Business logic asks a Clock for the time instead of calling Date.now(), so tests can fix it (plan: inject the clock). */
export interface Clock {
  now(): Date;
}
