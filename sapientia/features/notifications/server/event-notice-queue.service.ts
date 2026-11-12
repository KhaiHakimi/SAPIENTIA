import 'server-only';
import type { PoolClient } from 'pg';
import { planDelivery } from '@/features/delivery/server/delivery-plan.service';
import { queueEventNoticeJob } from '@/features/delivery/server/delivery-queue.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import type { EventNoticeJob } from '../interfaces/event-notice.interface';

/** Names one event and its row, e.g. "relief.assigned:<id>": the job's singleton key and the key its sends are recorded under. */
export function noticeKey(job: EventNoticeJob): string {
  return `${job.kind}:${'extensionId' in job ? job.extensionId : job.reliefId}`;
}

/**
 * Queues a message inside the caller's transaction, so it exists only if the event is saved. It runs at sendAt when given
 * (a relief's own delivery time), otherwise at the next working moment: an event outside working hours is told at the next
 * working start, never at night (plan: held delivery applies to everything sent to staff).
 */
export async function queueEventNotice(client: PoolClient, job: EventNoticeJob, clock: Clock, sendAt?: Date): Promise<void> {
  const startAfter = sendAt ?? (await planDelivery(client, job.schoolId, false, clock)).deliverAt;
  await queueEventNoticeJob(client, job, noticeKey(job), startAfter);
}
