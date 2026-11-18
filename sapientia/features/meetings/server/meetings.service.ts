import 'server-only';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { planDelivery } from '@/features/delivery/server/delivery-plan.service';
import { loadWorkingCalendar } from '@/features/delivery/server/school-calendar.repository';
import type { SessionGuardian } from '@/features/guardians/interfaces/guardian.interface';
import { findChild } from '@/features/guardians/server/guardians.repository';
import { queueEventNotice } from '@/features/notifications/server/event-notice-queue.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { logger } from '@/shared/server/logger.service';
import { MEETING_HISTORY_DAYS, MEETING_LIST_MAX, MEETING_PENDING_MAX } from '../constants/meetings.constants';
import type {
  AnswerMeetingRequest,
  ChildMeetings,
  GuardianMeeting,
  RequestMeetingRequest,
  TeacherMeeting,
  TeacherMeetings,
} from '../interfaces/meeting.interface';
import { checkMeetingTime } from '../services/meeting-time.service';
import {
  answerMeeting,
  countPendingForGuardian,
  findLinkMeeting,
  findTeacherMeeting,
  insertMeeting,
  listClassTeachers,
  listLinkMeetings,
  listTeacherMeetings,
  lockGuardian,
  withdrawMeeting,
} from './meetings.repository';

/**
 * Meeting requests (plan Phase 4, Sprint 13 part 2). A guardian asks one of the child's teachers, through their own active
 * link. The request reaches the teacher only in working hours: deliver_at is worked out exactly as for a task, and until then
 * the teacher's list leaves it out. The teacher sees the guardian's name only and sets a time inside working hours.
 */

const DAY_MS = 86_400_000;
const historySince = (clock: Clock) => new Date(clock.now().getTime() - MEETING_HISTORY_DAYS * DAY_MS);

/** The teachers the guardian may ask about this child, and the requests already made. 404 for a link not the guardian's. */
export async function getChildMeetings(guardian: SessionGuardian, linkId: string, clock: Clock): Promise<ChildMeetings> {
  const db = getPool();
  const child = await findChild(db, guardian.schoolId, guardian.id, linkId);
  if (!child) throw new NotFoundError();
  const teachers = child.class_id ? await listClassTeachers(db, guardian.schoolId, child.class_id) : [];
  const requests = await listLinkMeetings(db, guardian.schoolId, linkId, historySince(clock), MEETING_LIST_MAX);
  return { teachers, requests };
}

/**
 * A guardian asks a teacher of the child's class for a meeting. Refused when the teacher does not teach that class, when the
 * guardian already has MEETING_PENDING_MAX waiting, or when this child already has one waiting for this teacher.
 */
export async function requestMeeting(
  guardian: SessionGuardian,
  linkId: string,
  input: RequestMeetingRequest,
  clock: Clock,
): Promise<GuardianMeeting> {
  const meeting = await withTransaction(async (client) => {
    // One request at a time per guardian, so two quick taps cannot pass the limit together.
    await lockGuardian(client, guardian.schoolId, guardian.id);
    const child = await findChild(client, guardian.schoolId, guardian.id, linkId);
    if (!child) throw new NotFoundError();
    const teachers = child.class_id ? await listClassTeachers(client, guardian.schoolId, child.class_id) : [];
    if (!teachers.some((teacher) => teacher.id === input.teacherId)) throw new ValidationError({ teacherId: 'invalid_teacher' });
    if ((await countPendingForGuardian(client, guardian.schoolId, guardian.id)) >= MEETING_PENDING_MAX) {
      throw new ValidationError({ teacherId: 'too_many_meetings' });
    }

    const plan = await planDelivery(client, guardian.schoolId, false, clock);
    const id = await insertMeeting(client, guardian.schoolId, { linkId, ...input, deliverAt: plan.deliverAt, now: clock.now() });
    if (!id) throw new ConflictError('This teacher already has a request about this child.', { teacherId: 'already_requested' });
    await writeAudit(client, guardian.schoolId, [{
      actorId: guardian.id, action: 'meeting.requested', entityType: 'meeting', entityId: id,
      metadata: { linkId, teacherId: input.teacherId, topic: input.topic, held: plan.deliveredAt === null, actorKind: 'guardian' },
    }]);
    await queueEventNotice(client, { kind: 'meeting.requested', schoolId: guardian.schoolId, meetingId: id }, clock, plan.deliverAt);
    const saved = await findLinkMeeting(client, guardian.schoolId, linkId, id);
    if (!saved) throw new NotFoundError();
    return saved;
  });
  logger.info('meetings.requested', { schoolId: guardian.schoolId, meetingId: meeting.id });
  return meeting;
}

/** The guardian withdraws a request still waiting. 404 once it has been answered, or for another guardian's request. */
export async function withdrawGuardianMeeting(guardian: SessionGuardian, meetingId: string, clock: Clock): Promise<void> {
  await withTransaction(async (client) => {
    const linkId = await withdrawMeeting(client, guardian.schoolId, guardian.id, meetingId, clock.now());
    if (!linkId) throw new NotFoundError();
    await writeAudit(client, guardian.schoolId, [{
      actorId: guardian.id, action: 'meeting.withdrawn', entityType: 'meeting', entityId: meetingId,
      metadata: { linkId, actorKind: 'guardian' },
    }]);
  });
}

/** The signed-in teacher's requests that have reached them. Any staff role: whoever teaches a class can be asked. */
export async function listMyMeetings(actor: SessionUser, clock: Clock): Promise<TeacherMeetings> {
  const items = await listTeacherMeetings(getPool(), actor.schoolId, actor.id, clock.now(), historySince(clock), MEETING_LIST_MAX);
  return { items, timeZone: actor.timeZone };
}

/**
 * The teacher accepts with a time inside working hours, or declines with a reason code. 404 for anyone but the teacher asked,
 * and for a request still held for working hours; 409 when it is no longer waiting.
 */
export async function answerMyMeeting(
  actor: SessionUser,
  meetingId: string,
  input: AnswerMeetingRequest,
  clock: Clock,
): Promise<TeacherMeeting> {
  return withTransaction(async (client) => {
    const now = clock.now();
    const meeting = await findTeacherMeeting(client, actor.schoolId, actor.id, meetingId, now);
    if (!meeting) throw new NotFoundError();
    if (meeting.status !== 'pending') throw new ConflictError('This request is no longer waiting.', { answer: 'already_answered' });

    let answered: boolean;
    if (input.answer === 'accept') {
      const check = checkMeetingTime(input.date, input.time, now, await loadWorkingCalendar(client, actor.schoolId, now));
      if (!check.ok) throw new ValidationError({ [check.field]: check.reason });
      answered = await answerMeeting(client, actor.schoolId, meetingId, { status: 'accepted', meetingAt: check.at }, now);
    } else {
      answered = await answerMeeting(client, actor.schoolId, meetingId, { status: 'declined', reason: input.reason }, now);
    }
    if (!answered) throw new ConflictError('This request is no longer waiting.', { answer: 'already_answered' });

    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id,
      action: input.answer === 'accept' ? 'meeting.accepted' : 'meeting.declined',
      entityType: 'meeting',
      entityId: meetingId,
      metadata: input.answer === 'accept' ? {} : { reason: input.reason },
    }]);
    const saved = await findTeacherMeeting(client, actor.schoolId, actor.id, meetingId, now);
    if (!saved) throw new NotFoundError();
    return saved;
  });
}
