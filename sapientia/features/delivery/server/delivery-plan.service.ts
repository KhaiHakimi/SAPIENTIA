import 'server-only';
import { DateTime } from 'luxon';
import type { Clock } from '@/shared/interfaces/clock.interface';
import type { Queryable } from '@/shared/server/database.service';
import type { DeliveryPreview } from '../interfaces/working-calendar.interface';
import { deliveryTime } from '../services/working-time.service';
import { loadWorkingCalendar } from './school-calendar.repository';

export interface DeliveryPlan {
  /** When the task reaches its assignees. */
  deliverAt: Date;
  /** Set when it reaches them at once (inside working hours, or urgent); null while held. */
  deliveredAt: Date | null;
  timeZone: string;
  /** The school's date today and on the delivery day, for checking the due date. */
  today: string;
  deliveryDay: string;
}

/** Decides when a task created now reaches its assignees. An urgent override delivers immediately, whatever the hour. */
export async function planDelivery(db: Queryable, schoolId: string, urgent: boolean, clock: Clock): Promise<DeliveryPlan> {
  const now = clock.now();
  const calendar = await loadWorkingCalendar(db, schoolId, now);
  const deliverAt = urgent ? now : deliveryTime(now, calendar);
  const held = deliverAt.getTime() > now.getTime();
  const localDate = (instant: Date) => DateTime.fromJSDate(instant, { zone: calendar.timeZone }).toISODate() ?? '';
  return {
    deliverAt,
    deliveredAt: held ? null : now,
    timeZone: calendar.timeZone,
    today: localDate(now),
    deliveryDay: localDate(deliverAt),
  };
}

/** What the create form shows before sending: "Akan dihantar: Isnin 9 November, 7:30 pagi". */
export async function previewDelivery(db: Queryable, schoolId: string, clock: Clock): Promise<DeliveryPreview> {
  const plan = await planDelivery(db, schoolId, false, clock);
  return { deliverAt: plan.deliverAt.toISOString(), held: plan.deliveredAt === null, timeZone: plan.timeZone };
}
