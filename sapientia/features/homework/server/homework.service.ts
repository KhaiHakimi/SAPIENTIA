import 'server-only';
import { DateTime } from 'luxon';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Feasibility } from '@/features/capacity/interfaces/capacity.interface';
import { assessAssignees } from '@/features/capacity/server/feasibility.service';
import type { WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { loadWorkingCalendar } from '@/features/delivery/server/school-calendar.repository';
import { isWorkingDay } from '@/features/delivery/services/working-time.service';
import type { SessionStudent } from '@/features/students/interfaces/student.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { NotFoundError, ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable, withTransaction } from '@/shared/server/database.service';
import {
  CLASS_GOAL_MIN_PUPILS, HOMEWORK_DUE_DAYS_AHEAD, HOMEWORK_LIST_MAX, LOAD_WARNING_DEADLINES, MARK_BY_DAYS_AFTER_DUE, MY_HOMEWORK_DAYS_BACK,
  PUPIL_HOMEWORK_DAYS_BACK,
} from '../constants/homework.constants';
import type {
  HandInList, Homework, HomeworkPreview, HomeworkPreviewRequest, MyHomework, PupilHomeworkList, SetHomeworkRequest,
} from '../interfaces/homework.interface';
import {
  clearHandIn, countClassHandIns, deleteHomework, findOwnHomework, insertHomework, isEnrolled, listClassHomeworkDays, listHandIns,
  listOwnHomework, listPupilHomework, listTeacherLessons, recordHandIn, setMarked, teachesLesson,
} from './homework.repository';

/**
 * Homework (plan Phase 4, Sprint 12). A teacher sets it for a class and subject on their own timetable; only the setter
 * reads or changes it afterwards, administrators included (anyone else gets 404). Audit entries carry ids only.
 */

const schoolDay = (instant: Date, calendar: WorkingCalendar, plusDays = 0) =>
  DateTime.fromJSDate(instant, { zone: calendar.timeZone }).plus({ days: plusDays }).toISODate() ?? '';

const addDays = (isoDate: string, days: number, calendar: WorkingCalendar) =>
  DateTime.fromISO(isoDate, { zone: calendar.timeZone }).plus({ days }).toISODate() ?? '';

/** The lesson must be the caller's, and the dates sensible: a school day from today, marking planned within reach of it. */
async function checkRequest(db: Queryable, actor: SessionUser, input: HomeworkPreviewRequest, now: Date): Promise<WorkingCalendar> {
  if (!(await teachesLesson(db, actor.schoolId, actor.id, input))) throw new ValidationError({ classId: 'not_your_lesson' });
  const calendar = await loadWorkingCalendar(db, actor.schoolId, now);
  if (input.dueOn < schoolDay(now, calendar)) throw new ValidationError({ dueOn: 'past_date' });
  if (input.dueOn > schoolDay(now, calendar, HOMEWORK_DUE_DAYS_AHEAD)) throw new ValidationError({ dueOn: 'too_far' });
  if (!isWorkingDay(input.dueOn, calendar)) throw new ValidationError({ dueOn: 'not_working_day' });
  if (input.markBy && input.markBy > addDays(input.dueOn, MARK_BY_DAYS_AFTER_DUE, calendar)) {
    throw new ValidationError({ markBy: 'too_far' });
  }
  return calendar;
}

/** The class's homework in the due date's Monday-to-Sunday week, and how much of it is due that very day. */
async function classLoad(db: Queryable, actor: SessionUser, input: HomeworkPreviewRequest, calendar: WorkingCalendar) {
  const due = DateTime.fromISO(input.dueOn, { zone: calendar.timeZone });
  const week = await listClassHomeworkDays(
    db, actor.schoolId, input.classId, due.startOf('week').toISODate() ?? '', due.endOf('week').toISODate() ?? '',
  );
  const sameDay = week.filter((day) => day.dueOn === input.dueOn).length;
  return { week, sameDay, loadWarning: sameDay + 1 >= LOAD_WARNING_DEADLINES };
}

/** Would the setter have the marking time in their working hours by the day they plan to finish? Advice only. */
async function markingCheck(
  db: Queryable,
  actor: SessionUser,
  input: HomeworkPreviewRequest,
  calendar: WorkingCalendar,
  now: Date,
): Promise<Feasibility | null> {
  if (input.markingMinutes === undefined || input.markBy === undefined) return null;
  const [result] = await assessAssignees(db, actor.schoolId, {
    staff: [{ id: actor.id, name: actor.name, role: actor.role }],
    calendar,
    from: now,
    dueOn: input.markBy,
    neededMinutes: input.markingMinutes,
  });
  return {
    feasible: result.feasible, neededMinutes: result.neededMinutes, freeMinutes: result.freeMinutes,
    workingMinutes: result.workingMinutes, teachingMinutes: result.teachingMinutes, committedMinutes: result.committedMinutes,
    earliestDueOn: result.earliestDueOn,
  };
}

async function findOwnOrThrow(db: Queryable, actor: SessionUser, homeworkId: string): Promise<Homework> {
  const homework = await findOwnHomework(db, actor.schoolId, actor.id, homeworkId);
  if (!homework) throw new NotFoundError();
  return homework;
}

/** The caller's lessons, for the form, and their homework from two weeks ago onwards. */
export async function getMyHomework(actor: SessionUser, clock: Clock): Promise<MyHomework> {
  const db = getPool();
  const calendar = await loadWorkingCalendar(db, actor.schoolId, clock.now());
  const fromDate = schoolDay(clock.now(), calendar, -MY_HOMEWORK_DAYS_BACK);
  const lessons = await listTeacherLessons(db, actor.schoolId, actor.id);
  const items = await listOwnHomework(db, actor.schoolId, actor.id, fromDate, HOMEWORK_LIST_MAX);
  return { lessons, items };
}

/** The dry run behind the form: the class's week, the same-day warning and the marking check. Changes nothing. */
export async function previewHomework(actor: SessionUser, input: HomeworkPreviewRequest, clock: Clock): Promise<HomeworkPreview> {
  const db = getPool();
  const now = clock.now();
  const calendar = await checkRequest(db, actor, input, now);
  return { ...(await classLoad(db, actor, input, calendar)), marking: await markingCheck(db, actor, input, calendar, now) };
}

/**
 * Sets homework. A third piece due the same day for the class is never refused: it is saved as flagged and the audit log
 * records it (plan Phase 4: warn, never block). The marking estimate counts in the setter's capacity from now on.
 */
export async function setHomework(actor: SessionUser, input: SetHomeworkRequest, clock: Clock): Promise<Homework> {
  return withTransaction(async (client) => {
    const now = clock.now();
    const calendar = await checkRequest(client, actor, input, now);
    const { sameDay, loadWarning } = await classLoad(client, actor, input, calendar);
    const id = await insertHomework(client, actor.schoolId, {
      classId: input.classId,
      subjectId: input.subjectId,
      setBy: actor.id,
      title: input.title,
      details: input.details ?? null,
      dueOn: input.dueOn,
      markingMinutes: input.markingMinutes ?? null,
      markBy: input.markBy ?? null,
      loadFlagged: loadWarning,
      now,
    });
    await writeAudit(client, actor.schoolId, [
      {
        actorId: actor.id, action: 'homework.set', entityType: 'homework', entityId: id,
        metadata: { classId: input.classId, subjectId: input.subjectId, markingMinutes: input.markingMinutes ?? null },
      },
      ...(loadWarning ? [{
        actorId: actor.id, action: 'homework.load_flagged' as const, entityType: 'homework' as const, entityId: id,
        metadata: { alreadyDue: sameDay },
      }] : []),
    ]);
    return findOwnOrThrow(client, actor, id);
  });
}

/** Records that the marking is done (its time stops counting), or undoes that. Homework without an estimate cannot be. */
export async function updateHomework(actor: SessionUser, homeworkId: string, marked: boolean, clock: Clock): Promise<Homework> {
  return withTransaction(async (client) => {
    const homework = await findOwnOrThrow(client, actor, homeworkId);
    if (homework.marked === marked) return homework;
    if (!(await setMarked(client, actor.schoolId, homeworkId, marked ? clock.now() : null))) {
      throw new ValidationError({ marked: 'no_marking_estimate' });
    }
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: marked ? 'homework.marked' : 'homework.unmarked', entityType: 'homework', entityId: homeworkId,
    }]);
    return findOwnOrThrow(client, actor, homeworkId);
  });
}

/** Removes the homework and its hand-ins; its marking time stops counting. */
export async function removeHomework(actor: SessionUser, homeworkId: string): Promise<void> {
  await withTransaction(async (client) => {
    await findOwnOrThrow(client, actor, homeworkId);
    await deleteHomework(client, actor.schoolId, homeworkId);
    await writeAudit(client, actor.schoolId, [{ actorId: actor.id, action: 'homework.removed', entityType: 'homework', entityId: homeworkId }]);
  });
}

/** The class list for ticking paper hand-ins: the setter only. */
export async function getHandIns(actor: SessionUser, homeworkId: string): Promise<HandInList> {
  const db = getPool();
  const homework = await findOwnOrThrow(db, actor, homeworkId);
  return { homework, pupils: await listHandIns(db, actor.schoolId, homeworkId, homework.class.id) };
}

/** Ticks or unticks one pupil. The pupil must be in the homework's class now; anyone else is treated as not existing. */
export async function setHandIn(actor: SessionUser, target: { homeworkId: string; studentId: string }, handedIn: boolean, clock: Clock) {
  await withTransaction(async (client) => {
    const homework = await findOwnOrThrow(client, actor, target.homeworkId);
    if (!(await isEnrolled(client, actor.schoolId, target.studentId, homework.class.id))) throw new NotFoundError();
    if (handedIn) {
      await recordHandIn(client, actor.schoolId, { ...target, by: actor.id, at: clock.now() });
    } else {
      await clearHandIn(client, actor.schoolId, target.homeworkId, target.studentId);
    }
    await writeAudit(client, actor.schoolId, [{
      actorId: actor.id, action: handedIn ? 'homework.hand_in_recorded' : 'homework.hand_in_cleared', entityType: 'homework',
      entityId: target.homeworkId, metadata: { studentId: target.studentId },
    }]);
  });
  return { studentId: target.studentId, handedIn };
}

/**
 * The pupil's class's homework from a week ago onwards, with their own hand-in only, and the class's shared goal for this week
 * (counts, no names; withheld in a class under CLASS_GOAL_MIN_PUPILS). A pupil with no class has neither.
 */
export async function listHomeworkForPupil(student: SessionStudent, clock: Clock): Promise<PupilHomeworkList> {
  if (!student.classId) return { items: [], classGoal: null };
  const db = getPool();
  const today = DateTime.fromJSDate(clock.now(), { zone: student.timeZone });
  const fromDate = today.minus({ days: PUPIL_HOMEWORK_DAYS_BACK }).toISODate() ?? '';
  const week = { fromDate: today.startOf('week').toISODate() ?? '', toDate: today.endOf('week').toISODate() ?? '' };
  const pupil = { studentId: student.id, classId: student.classId };
  const items = await listPupilHomework(db, student.schoolId, pupil, fromDate, HOMEWORK_LIST_MAX);
  const counts = await countClassHandIns(db, student.schoolId, student.classId, week);
  const classGoal = counts.pupils < CLASS_GOAL_MIN_PUPILS ? null : { handedIn: counts.handedIn, expected: counts.pieces * counts.pupils };
  return { items, classGoal };
}
