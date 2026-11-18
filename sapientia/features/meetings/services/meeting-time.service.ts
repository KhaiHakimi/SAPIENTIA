import { DateTime } from 'luxon';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { isWithinWorkingHours } from '@/features/delivery/services/working-time.service';
import { MEETING_DAYS_AHEAD_MAX } from '../constants/meetings.constants';

export type MeetingTimeCheck =
  | { ok: true; at: Date }
  | { ok: false; field: 'date' | 'time'; reason: 'meeting_in_past' | 'meeting_too_far' | 'meeting_outside_hours' };

/**
 * Whether a teacher may set a meeting at this school-local date and time: still to come, at most MEETING_DAYS_AHEAD_MAX
 * days away, and inside working hours on a working day. A meeting is part of the teacher's working time, never their evening.
 */
export function checkMeetingTime(date: string, time: string, now: Date, calendar: WorkingCalendar): MeetingTimeCheck {
  const local = DateTime.fromISO(`${date}T${time}`, { zone: calendar.timeZone });
  if (!local.isValid) return { ok: false, field: 'date', reason: 'meeting_in_past' };
  const at = local.toJSDate();
  if (at.getTime() <= now.getTime()) return { ok: false, field: 'date', reason: 'meeting_in_past' };
  const lastDay = DateTime.fromJSDate(now, { zone: calendar.timeZone }).startOf('day').plus({ days: MEETING_DAYS_AHEAD_MAX + 1 });
  if (local >= lastDay) return { ok: false, field: 'date', reason: 'meeting_too_far' };
  if (!isWithinWorkingHours(at, calendar)) return { ok: false, field: 'time', reason: 'meeting_outside_hours' };
  return { ok: true, at };
}
