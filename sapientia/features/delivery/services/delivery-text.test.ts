import { describe, expect, it } from 'vitest';
import { describeDeliveryTime } from './delivery-text';

const ZONE = 'Asia/Kuala_Lumpur';
const NOW = new Date('2026-11-06T14:00:00Z');

describe('delivery time in plain words', () => {
  it('says the day and time in Bahasa Melayu, as the plan example does', () => {
    expect(describeDeliveryTime('2026-11-08T23:30:00Z', ZONE, 'ms', NOW)).toBe('Isnin 9 November, 7:30 pagi');
  });

  it('says it in English', () => {
    expect(describeDeliveryTime('2026-11-08T23:30:00Z', ZONE, 'en', NOW)).toBe('Monday 9 November, 7:30 am');
  });

  it('names the part of the day in Malay', () => {
    expect(describeDeliveryTime('2026-11-09T05:15:00Z', ZONE, 'ms', NOW)).toBe('Isnin 9 November, 1:15 tengah hari');
    expect(describeDeliveryTime('2026-11-09T08:00:00Z', ZONE, 'ms', NOW)).toBe('Isnin 9 November, 4:00 petang');
    expect(describeDeliveryTime('2026-11-09T12:00:00Z', ZONE, 'ms', NOW)).toBe('Isnin 9 November, 8:00 malam');
  });

  it('adds the year when the delivery is in another year', () => {
    expect(describeDeliveryTime('2027-01-03T23:30:00Z', ZONE, 'en', NOW)).toBe('Monday 4 January 2027, 7:30 am');
  });
});
