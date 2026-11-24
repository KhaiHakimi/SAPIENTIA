import { describe, expect, it } from 'vitest';
import type { Feasibility } from '@/features/capacity/interfaces/capacity.interface';
import { dayAfter, earliestExtensionDay, suggestedDueOn } from './extension-dates';

const figures = (earliestDueOn: string | null): Feasibility => ({
  feasible: false, neededMinutes: 120, freeMinutes: 30, workingMinutes: 570, teachingMinutes: 300, committedMinutes: 240, earliestDueOn,
});
const TODAY = '2026-11-10';

describe('dayAfter', () => {
  it('crosses month and year ends', () => {
    expect(dayAfter('2026-11-12')).toBe('2026-11-13');
    expect(dayAfter('2026-11-30')).toBe('2026-12-01');
    expect(dayAfter('2026-12-31')).toBe('2027-01-01');
    expect(dayAfter('2028-02-28')).toBe('2028-02-29');
  });
});

describe('earliestExtensionDay', () => {
  it('is the day after the due date, or today once the work is overdue', () => {
    expect(earliestExtensionDay('2026-11-12', TODAY)).toBe('2026-11-13');
    expect(earliestExtensionDay('2026-11-09', TODAY)).toBe(TODAY);
    expect(earliestExtensionDay('2026-11-01', TODAY)).toBe(TODAY);
  });
});

describe('suggestedDueOn', () => {
  it('starts from the earliest day the work fits', () => {
    expect(suggestedDueOn('2026-11-12', figures('2026-11-17'), TODAY)).toBe('2026-11-17');
  });

  it('falls back to the next day when there is no later date to suggest', () => {
    expect(suggestedDueOn('2026-11-12', null, TODAY)).toBe('2026-11-13');
    expect(suggestedDueOn('2026-11-12', figures(null), TODAY)).toBe('2026-11-13');
    // The work already fits by the due date: the check has nothing later to offer.
    expect(suggestedDueOn('2026-11-12', figures('2026-11-12'), TODAY)).toBe('2026-11-13');
  });

  it('never suggests a day in the past for overdue work', () => {
    expect(suggestedDueOn('2026-11-01', null, TODAY)).toBe(TODAY);
    expect(suggestedDueOn('2026-11-01', figures('2026-11-02'), TODAY)).toBe(TODAY);
    expect(suggestedDueOn('2026-11-01', figures('2026-11-12'), TODAY)).toBe('2026-11-12');
  });
});
