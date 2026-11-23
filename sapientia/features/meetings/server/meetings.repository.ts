import 'server-only';
import type { Queryable } from '@/shared/server/database.service';
import type {
  GuardianMeeting,
  MeetingDeclineReason,
  MeetingStatus,
  MeetingTeacher,
  MeetingTimeOfDay,
  MeetingTopic,
  TeacherMeeting,
} from '../interfaces/meeting.interface';

/** Meeting requests. Every function takes schoolId first and filters on it. */

/** The active staff who teach this class on the timetable, with the subjects they teach it. */
export async function listClassTeachers(db: Queryable, schoolId: string, classId: string): Promise<MeetingTeacher[]> {
  const { rows } = await db.query<{ id: string; name: string; subjects: string[] }>(
    `SELECT u.id, u.name, COALESCE(array_agg(DISTINCT j.name ORDER BY j.name) FILTER (WHERE j.name IS NOT NULL), '{}') AS subjects
       FROM timetable_slots s
       JOIN users u ON u.id = s.teacher_id AND u.school_id = s.school_id AND u.status = 'active'
       LEFT JOIN subjects j ON j.id = s.subject_id AND j.school_id = s.school_id
      WHERE s.school_id = $1 AND s.class_id = $2
      GROUP BY u.id, u.name
      ORDER BY u.name, u.id`,
    [schoolId, classId],
  );
  return rows;
}

export async function countPendingForGuardian(db: Queryable, schoolId: string, guardianId: string): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM meeting_requests m
       JOIN guardian_links l ON l.id = m.link_id AND l.school_id = m.school_id
      WHERE m.school_id = $1 AND l.guardian_id = $2 AND m.status = 'pending'`,
    [schoolId, guardianId],
  );
  return rows[0].total;
}

export interface NewMeetingRow {
  linkId: string;
  teacherId: string;
  topic: MeetingTopic;
  timeOfDay: MeetingTimeOfDay;
  deliverAt: Date;
  now: Date;
}

/** The new request's id, or null when this link already has one waiting for this teacher. */
export async function insertMeeting(db: Queryable, schoolId: string, input: NewMeetingRow): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO meeting_requests (school_id, link_id, teacher_id, topic, time_of_day, deliver_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (link_id, teacher_id) WHERE status = 'pending' DO NOTHING
     RETURNING id`,
    [schoolId, input.linkId, input.teacherId, input.topic, input.timeOfDay, input.deliverAt, input.now],
  );
  return rows[0]?.id ?? null;
}

interface GuardianMeetingRow {
  id: string;
  teacher_name: string;
  topic: MeetingTopic;
  time_of_day: MeetingTimeOfDay;
  status: MeetingStatus;
  created_at: Date;
  deliver_at: Date;
  meeting_at: Date | null;
  decline_reason: MeetingDeclineReason | null;
}

const toGuardianMeeting = (row: GuardianMeetingRow): GuardianMeeting => ({
  id: row.id,
  teacherName: row.teacher_name,
  topic: row.topic,
  timeOfDay: row.time_of_day,
  status: row.status,
  createdAt: row.created_at.toISOString(),
  deliverAt: row.deliver_at.toISOString(),
  meetingAt: row.meeting_at?.toISOString() ?? null,
  declineReason: row.decline_reason,
});

const GUARDIAN_MEETING_SELECT = `SELECT m.id, u.name AS teacher_name, m.topic, m.time_of_day, m.status, m.created_at, m.deliver_at,
       m.meeting_at, m.decline_reason
  FROM meeting_requests m
  JOIN users u ON u.id = m.teacher_id AND u.school_id = m.school_id`;

/** One link's requests: those waiting, and those closed since `since`, newest first. */
export async function listLinkMeetings(db: Queryable, schoolId: string, linkId: string, since: Date, limit: number) {
  const { rows } = await db.query<GuardianMeetingRow>(
    `${GUARDIAN_MEETING_SELECT}
      WHERE m.school_id = $1 AND m.link_id = $2 AND (m.status = 'pending' OR m.closed_at >= $3)
      ORDER BY m.created_at DESC, m.id
      LIMIT $4`,
    [schoolId, linkId, since, limit],
  );
  return rows.map(toGuardianMeeting);
}

export async function findLinkMeeting(db: Queryable, schoolId: string, linkId: string, meetingId: string) {
  const { rows } = await db.query<GuardianMeetingRow>(
    `${GUARDIAN_MEETING_SELECT} WHERE m.school_id = $1 AND m.link_id = $2 AND m.id = $3`,
    [schoolId, linkId, meetingId],
  );
  return rows[0] ? toGuardianMeeting(rows[0]) : null;
}

/** The guardian withdraws a request still waiting, through one of their active links. Returns the link's id, or null. */
export async function withdrawMeeting(db: Queryable, schoolId: string, guardianId: string, meetingId: string, now: Date) {
  const { rows } = await db.query<{ link_id: string }>(
    `UPDATE meeting_requests m SET status = 'withdrawn', closed_at = $4
       FROM guardian_links l
      WHERE m.school_id = $1 AND m.id = $3 AND m.status = 'pending'
        AND l.id = m.link_id AND l.school_id = m.school_id AND l.guardian_id = $2 AND l.status = 'active'
      RETURNING m.link_id`,
    [schoolId, guardianId, meetingId, now],
  );
  return rows[0]?.link_id ?? null;
}

/**
 * A request belongs to the link and ends with it (docs/phase-4-students.md): one still waiting, and one accepted for a time
 * still to come, so a guardian who no longer has the link is not expected at school. A meeting already held keeps its answer.
 * The meeting time is cleared because only an accepted request carries one (meeting_requests_accepted). `$1` is the school
 * and `$2` the time now in every query that uses this.
 */
const CANCEL_OPEN = `UPDATE meeting_requests m SET status = 'cancelled', meeting_at = NULL, closed_at = $2`;
const IS_OPEN = `(m.status = 'pending' OR (m.status = 'accepted' AND m.meeting_at > $2))`;

/** When a link ends, its open requests end with it. */
export async function cancelOpenForLink(db: Queryable, schoolId: string, linkId: string, now: Date): Promise<number> {
  const result = await db.query(`${CANCEL_OPEN} WHERE m.school_id = $1 AND m.link_id = $3 AND ${IS_OPEN}`, [schoolId, now, linkId]);
  return result.rowCount ?? 0;
}

/** When a guardian is disabled, the open requests on all their links end: they can no longer see or withdraw them. */
export async function cancelOpenForGuardian(db: Queryable, schoolId: string, guardianId: string, now: Date): Promise<number> {
  const result = await db.query(
    `${CANCEL_OPEN}
       FROM guardian_links l
      WHERE m.school_id = $1 AND l.id = m.link_id AND l.school_id = m.school_id AND l.guardian_id = $3 AND ${IS_OPEN}`,
    [schoolId, now, guardianId],
  );
  return result.rowCount ?? 0;
}

/**
 * When a pupil moves class, open requests about them to teachers who do not teach the new class end; a teacher who still
 * teaches them keeps theirs. Who teaches a class is read from the timetable, as when a request is made (listClassTeachers).
 */
export async function cancelOpenOutsideClass(
  db: Queryable,
  schoolId: string,
  pupil: { studentId: string; classId: string },
  now: Date,
): Promise<number> {
  const result = await db.query(
    `${CANCEL_OPEN}
       FROM guardian_links l
      WHERE m.school_id = $1 AND l.id = m.link_id AND l.school_id = m.school_id AND l.student_id = $3 AND ${IS_OPEN}
        AND NOT EXISTS (
          SELECT 1 FROM timetable_slots s WHERE s.school_id = m.school_id AND s.class_id = $4 AND s.teacher_id = m.teacher_id
        )`,
    [schoolId, now, pupil.studentId, pupil.classId],
  );
  return result.rowCount ?? 0;
}

interface TeacherMeetingRow {
  id: string;
  guardian_name: string;
  pupil_name: string;
  class_name: string | null;
  topic: MeetingTopic;
  time_of_day: MeetingTimeOfDay;
  status: MeetingStatus;
  deliver_at: Date;
  meeting_at: Date | null;
  decline_reason: MeetingDeclineReason | null;
}

const toTeacherMeeting = (row: TeacherMeetingRow): TeacherMeeting => ({
  id: row.id,
  guardianName: row.guardian_name,
  pupilName: row.pupil_name,
  className: row.class_name,
  topic: row.topic,
  timeOfDay: row.time_of_day,
  status: row.status,
  receivedAt: row.deliver_at.toISOString(),
  meetingAt: row.meeting_at?.toISOString() ?? null,
  declineReason: row.decline_reason,
});

/** Only what the teacher needs: the guardian's name, the pupil and class, the topic. Never the relationship or username. */
const TEACHER_MEETING_SELECT = `SELECT m.id, g.name AS guardian_name, s.name AS pupil_name, c.name AS class_name, m.topic, m.time_of_day,
       m.status, m.deliver_at, m.meeting_at, m.decline_reason
  FROM meeting_requests m
  JOIN guardian_links l ON l.id = m.link_id AND l.school_id = m.school_id
  JOIN guardians g ON g.id = l.guardian_id AND g.school_id = l.school_id
  JOIN students s ON s.id = l.student_id AND s.school_id = l.school_id
  LEFT JOIN class_enrolments e ON e.student_id = s.id AND e.school_id = s.school_id
  LEFT JOIN classes c ON c.id = e.class_id AND c.school_id = e.school_id`;

/**
 * The teacher's requests that have reached them (deliver_at passed): waiting ones first, then those closed since `since`.
 * A request made at night stays out of this list until the next working start.
 */
export async function listTeacherMeetings(db: Queryable, schoolId: string, teacherId: string, now: Date, since: Date, limit: number) {
  const { rows } = await db.query<TeacherMeetingRow>(
    `${TEACHER_MEETING_SELECT}
      WHERE m.school_id = $1 AND m.teacher_id = $2 AND m.deliver_at <= $3 AND (m.status = 'pending' OR m.closed_at >= $4)
      ORDER BY (m.status = 'pending') DESC, m.deliver_at DESC, m.id
      LIMIT $5`,
    [schoolId, teacherId, now, since, limit],
  );
  return rows.map(toTeacherMeeting);
}

export async function findTeacherMeeting(db: Queryable, schoolId: string, teacherId: string, meetingId: string, now: Date) {
  const { rows } = await db.query<TeacherMeetingRow>(
    `${TEACHER_MEETING_SELECT} WHERE m.school_id = $1 AND m.teacher_id = $2 AND m.id = $3 AND m.deliver_at <= $4`,
    [schoolId, teacherId, meetingId, now],
  );
  return rows[0] ? toTeacherMeeting(rows[0]) : null;
}

export type MeetingAnswer =
  | { status: 'accepted'; meetingAt: Date }
  | { status: 'declined'; reason: MeetingDeclineReason };

/** Answers a waiting request. False when it is no longer waiting (answered, withdrawn or cancelled meanwhile). */
export async function answerMeeting(db: Queryable, schoolId: string, meetingId: string, answer: MeetingAnswer, now: Date) {
  const result = await db.query(
    `UPDATE meeting_requests SET status = $3, meeting_at = $4, decline_reason = $5, closed_at = $6
      WHERE school_id = $1 AND id = $2 AND status = 'pending'`,
    [
      schoolId, meetingId, answer.status,
      answer.status === 'accepted' ? answer.meetingAt : null,
      answer.status === 'declined' ? answer.reason : null,
      now,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

/** For the notice to the teacher: still waiting, and to whom. */
export async function findMeetingForNotice(db: Queryable, schoolId: string, meetingId: string) {
  const { rows } = await db.query<{ teacher_id: string; status: MeetingStatus }>(
    'SELECT teacher_id, status FROM meeting_requests WHERE school_id = $1 AND id = $2',
    [schoolId, meetingId],
  );
  return rows[0] ?? null;
}

/** When a teacher's login is removed, requests still waiting for them end: nobody is left to answer. */
export async function cancelPendingForTeacher(db: Queryable, schoolId: string, teacherId: string, now: Date): Promise<number> {
  const result = await db.query(
    `UPDATE meeting_requests SET status = 'cancelled', closed_at = $3 WHERE school_id = $1 AND teacher_id = $2 AND status = 'pending'`,
    [schoolId, teacherId, now],
  );
  return result.rowCount ?? 0;
}
