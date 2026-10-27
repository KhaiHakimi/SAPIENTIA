import type { SlotStatus, TimetableSlot } from '../interfaces/timetable.interface';

/** "HH:MM" to minutes after midnight. */
export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Where a lesson stands at a given time. Lessons on other days are always "upcoming", so nothing is greyed out there. */
export function slotStatus(slot: TimetableSlot, isToday: boolean, nowMinutes: number): SlotStatus {
  if (!isToday) return 'upcoming';
  const start = toMinutes(slot.from);
  const end = toMinutes(slot.to);
  if (nowMinutes >= end) return 'past';
  if (nowMinutes >= start) return 'now';
  return 'upcoming';
}

export interface SlotProgress {
  minutesLeft: number;
  percent: number;
}

/** How far through the current lesson we are. */
export function slotProgress(slot: TimetableSlot, nowMinutes: number): SlotProgress {
  const start = toMinutes(slot.from);
  const end = toMinutes(slot.to);
  return { minutesLeft: end - nowMinutes, percent: Math.round(((nowMinutes - start) / (end - start)) * 100) };
}
