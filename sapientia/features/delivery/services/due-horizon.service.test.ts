import { describe, expect, it } from 'vitest';
import { isBeyondDueHorizon, latestDueOn } from './due-horizon.service';

describe('due date horizon', () => {
  it('reaches 366 days past today, across a year end', () => {
    expect(latestDueOn('2026-11-23')).toBe('2027-11-24');
  });

  it('accepts the last day and refuses the day after and absurd years', () => {
    expect(isBeyondDueHorizon('2027-11-24', '2026-11-23')).toBe(false);
    expect(isBeyondDueHorizon('2027-11-25', '2026-11-23')).toBe(true);
    expect(isBeyondDueHorizon('9999-12-31', '2026-11-23')).toBe(true);
  });
});
