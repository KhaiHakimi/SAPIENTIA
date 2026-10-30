import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import type { CalendarEvent, CalendarEventKind, SchoolSettings } from '../interfaces/working-calendar.interface';
import { deleteEvent, insertEvent, listEvents, loadSettings, saveSettings } from './school-calendar.repository';

/** How much of the calendar the page shows by default: the last month and the year ahead. */
const CALENDAR_PAST_DAYS = 31;
const CALENDAR_FUTURE_DAYS = 366;

export function getSchoolSettings(actor: SessionUser): Promise<SchoolSettings> {
  return loadSettings(getPool(), actor.schoolId);
}

/**
 * Administrators change working hours, weekend and state. The audit entry names the fields that changed, not their values.
 * Tasks already held keep the delivery time worked out when they were sent.
 */
export async function updateSchoolSettings(
  actor: SessionUser,
  patch: Partial<Omit<SchoolSettings, 'timeZone'>>,
  clock: Clock,
): Promise<SchoolSettings> {
  return withTransaction(async (client) => {
    const current = await loadSettings(client, actor.schoolId);
    const next: SchoolSettings = { ...current, ...patch };
    if (next.workStart >= next.workEnd) throw new ValidationError({ workEnd: 'end_before_start' });
    if (next.weekendDays.length >= 7) throw new ValidationError({ weekendDays: 'no_working_days' });

    const changed = (Object.keys(patch) as (keyof typeof patch)[])
      .filter((key) => JSON.stringify(patch[key]) !== JSON.stringify(current[key]));
    await saveSettings(client, actor.schoolId, next, actor.id, clock.now());
    if (changed.length > 0) {
      await writeAudit(client, actor.schoolId, [
        { actorId: actor.id, action: 'settings.updated', entityType: 'school', entityId: actor.schoolId, metadata: { fields: changed.join(',') } },
      ]);
    }
    return next;
  });
}

export async function listCalendar(
  actor: SessionUser,
  from: string | undefined,
  to: string | undefined,
  clock: Clock,
): Promise<CalendarEvent[]> {
  const settings = await loadSettings(getPool(), actor.schoolId);
  const today = DateTime.fromJSDate(clock.now(), { zone: settings.timeZone });
  return listEvents(
    getPool(),
    actor.schoolId,
    from ?? today.minus({ days: CALENDAR_PAST_DAYS }).toISODate() ?? '',
    to ?? today.plus({ days: CALENDAR_FUTURE_DAYS }).toISODate() ?? '',
  );
}

export async function addCalendarEvent(
  actor: SessionUser,
  input: { onDate: string; kind: CalendarEventKind; title: string },
): Promise<CalendarEvent> {
  try {
    return await withTransaction(async (client) => {
      const event = await insertEvent(client, actor.schoolId, { ...input, createdBy: actor.id });
      await writeAudit(client, actor.schoolId, [
        { actorId: actor.id, action: 'calendar.event_added', entityType: 'calendar_event', entityId: event.id, metadata: { kind: input.kind, onDate: input.onDate } },
      ]);
      return event;
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictError('There is already an entry for this date.', { onDate: 'date_taken' });
    }
    throw error;
  }
}

export async function removeCalendarEvent(actor: SessionUser, eventId: string): Promise<void> {
  await withTransaction(async (client) => {
    if (!(await deleteEvent(client, actor.schoolId, eventId))) throw new NotFoundError();
    await writeAudit(client, actor.schoolId, [
      { actorId: actor.id, action: 'calendar.event_removed', entityType: 'calendar_event', entityId: eventId },
    ]);
  });
}
