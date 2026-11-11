import { describe, expect, it } from 'vitest';
import { formatDuration } from './duration-text';

describe('formatDuration', () => {
  it.each([
    [0, '0 minit', '0 minutes'],
    [1, '1 minit', '1 minute'],
    [45, '45 minit', '45 minutes'],
    [60, '1 jam', '1 hour'],
    [61, '1 jam 1 minit', '1 hour 1 minute'],
    [150, '2 jam 30 minit', '2 hours 30 minutes'],
    [6000, '100 jam', '100 hours'],
  ])('%i minutes', (minutes, malay, english) => {
    expect(formatDuration(minutes, 'ms')).toBe(malay);
    expect(formatDuration(minutes, 'en')).toBe(english);
  });

  it('never shows a negative time', () => {
    expect(formatDuration(-30, 'en')).toBe('0 minutes');
  });
});
