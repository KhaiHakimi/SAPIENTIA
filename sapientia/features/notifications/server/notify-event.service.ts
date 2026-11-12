import 'server-only';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { getPool, type Queryable } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import type { EventNotice, EventNoticeJob } from '../interfaces/event-notice.interface';
import type { NotificationSenders, NotifyResult } from '../interfaces/notification.interface';
import { buildEventEmail, buildEventPush, eventPath } from '../services/event-notice-content';
import { noticeKey } from './event-notice-queue.service';
import {
  findActiveRecipient, findExtensionForNotice, findReliefForNotice, findStaffName, listEventSentKeys, recordEventSent,
} from './event-notices.repository';
import { dispatchNotices } from './notice-dispatch.service';

const NOTHING_SENT: NotifyResult = { sent: 0, failed: 0 };

/**
 * Sends one message about an extension request or relief, when its job comes due. The event is read again now, so a
 * message that no longer applies is dropped: a request already answered, or a relief cancelled before its teacher was told.
 */
export async function notifyEvent(
  job: EventNoticeJob,
  clock: Clock,
  senders: NotificationSenders,
  appOrigin: string | null,
): Promise<NotifyResult> {
  const db = getPool();
  const key = noticeKey(job);
  const resolved = await resolveNotice(db, job);
  const recipient = resolved && await findActiveRecipient(db, job.schoolId, resolved.recipientId);
  if (!resolved || !recipient) {
    logger.info('notify.event_dropped', { notice: key });
    return NOTHING_SENT;
  }

  const { notice } = resolved;
  const link = appOrigin ? `${appOrigin}${eventPath(notice)}` : null;
  const message = { email: (to: string) => buildEventEmail(notice, recipient.name, link, to), push: buildEventPush(notice) };
  const result = await dispatchNotices(db, job.schoolId, [{ recipient, message }], senders, {
    sentKeys: await listEventSentKeys(db, job.schoolId, key),
    record: (userId, channel, target) => recordEventSent(db, job.schoolId, { noticeKey: key, userId, channel, target, at: clock.now() }),
  }, { notice: key });
  logger.info('notify.event_done', { notice: key, sent: result.sent, failed: result.failed });
  return result;
}

/** What to say and to whom, or null when the event no longer calls for a message. */
async function resolveNotice(db: Queryable, job: EventNoticeJob): Promise<{ notice: EventNotice; recipientId: string } | null> {
  switch (job.kind) {
    case 'extension.requested': {
      const request = await findExtensionForNotice(db, job.schoolId, job.extensionId);
      // Answered already, or asked of oneself: there is nothing left to tell the sender.
      if (!request || request.status !== 'pending' || request.sender_id === request.requested_by) return null;
      return {
        recipientId: request.sender_id,
        notice: {
          kind: job.kind, taskId: request.task_id, taskTitle: request.task_title, requesterName: request.requester_name,
          currentDueOn: request.current_due_on, requestedDueOn: request.requested_due_on,
        },
      };
    }
    case 'extension.answered': {
      const request = await findExtensionForNotice(db, job.schoolId, job.extensionId);
      if (!request || request.status === 'pending' || !request.decided_due_on) return null;
      return {
        recipientId: request.requested_by,
        notice: {
          kind: job.kind, taskId: request.task_id, taskTitle: request.task_title, deciderName: request.decider_name ?? '',
          outcome: request.status, dueOn: request.decided_due_on,
        },
      };
    }
    case 'relief.assigned': {
      const relief = await findReliefForNotice(db, job.schoolId, job.reliefId);
      if (!relief) return null;
      const classAndSubject = [relief.class_name, relief.subject_name].filter(Boolean).join(', ');
      return {
        recipientId: relief.relief_teacher_id,
        notice: {
          kind: job.kind, reliefId: job.reliefId, absentTeacherName: relief.absent_teacher_name, onDate: relief.on_date,
          startTime: relief.start_time, endTime: relief.end_time, period: classAndSubject || relief.label,
        },
      };
    }
    case 'relief.cancelled': {
      const absentTeacherName = await findStaffName(db, job.schoolId, job.absentTeacherId);
      if (absentTeacherName === null) return null;
      return {
        recipientId: job.reliefTeacherId,
        notice: {
          kind: job.kind, reliefId: job.reliefId, absentTeacherName, onDate: job.onDate, startTime: job.startTime,
          endTime: job.endTime, period: null,
        },
      };
    }
  }
}
