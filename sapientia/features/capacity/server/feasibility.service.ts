import 'server-only';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { IsoWeekday, WorkingCalendar } from '@/features/delivery/interfaces/working-calendar.interface';
import { planDelivery } from '@/features/delivery/server/delivery-plan.service';
import { listSlotTimes } from '@/features/timetable/server/timetable.repository';
import type { StaffMember } from '@/features/users/interfaces/staff-user.interface';
import { listActiveStaff } from '@/features/users/server/users.repository';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ValidationError } from '@/shared/server/app-errors';
import { getPool, type Queryable } from '@/shared/server/database.service';
import type {
  AssigneeFeasibility, Commitment, FeasibilityRequest, FeasibilityResponse, WeeklySlot, Workload,
} from '../interfaces/capacity.interface';
import { checkFeasibility } from '../services/capacity.service';
import { weekEndDay } from '../services/capacity.service';
import { listCommitments, sumCommittedMinutes } from './capacity.repository';

export interface AssessInput {
  staff: readonly StaffMember[];
  calendar: WorkingCalendar;
  /** When the task reaches the assignees. */
  from: Date;
  dueOn: string;
  neededMinutes: number;
  /** A task to leave out of the commitments: the one being asked about, when it already exists. */
  exceptTaskId?: string;
}

function groupBy<Row, Value>(rows: readonly Row[], keyOf: (row: Row) => string, valueOf: (row: Row) => Value): Map<string, Value[]> {
  const groups = new Map<string, Value[]>();
  for (const row of rows) {
    const group = groups.get(keyOf(row));
    if (group) group.push(valueOf(row));
    else groups.set(keyOf(row), [valueOf(row)]);
  }
  return groups;
}

/**
 * Runs the capacity rules for each assignee. Two queries whatever the number of people: everyone's timetable, then
 * everyone's open commitments.
 */
export async function assessAssignees(db: Queryable, schoolId: string, input: AssessInput): Promise<AssigneeFeasibility[]> {
  const ids = input.staff.map((person) => person.id);
  const slots = groupBy(
    await listSlotTimes(db, schoolId, ids),
    (row) => row.teacher_id,
    (row): WeeklySlot => ({ weekday: row.weekday as IsoWeekday, start: row.start_time, end: row.end_time }),
  );
  const commitments = groupBy(
    await listCommitments(db, schoolId, ids, input.exceptTaskId ?? null),
    (row) => row.user_id,
    (row): Commitment => ({ dueOn: row.due_on, minutes: row.minutes }),
  );
  return input.staff.map((person) => ({
    assignee: { id: person.id, name: person.name },
    ...checkFeasibility({
      calendar: input.calendar,
      slots: slots.get(person.id) ?? [],
      commitments: commitments.get(person.id) ?? [],
      from: input.from,
      dueOn: input.dueOn,
      neededMinutes: input.neededMinutes,
    }),
  }));
}

/**
 * The workload shown when assigning (plan Phase 2): each person's estimated, unfinished work due by the end of this school
 * week, overdue work included. Totals only, for senders and administrators; there is no list of what the work is.
 */
export async function getWeekWorkload(actor: SessionUser, clock: Clock): Promise<Workload> {
  const weekEndsOn = weekEndDay(clock.now(), actor.timeZone);
  const rows = await sumCommittedMinutes(getPool(), actor.schoolId, weekEndsOn);
  return { weekEndsOn, items: rows.map((row) => ({ userId: row.user_id, committedMinutes: row.minutes })) };
}

/**
 * The dry run behind the create form (plan Phase 2): would each assignee have the time by the due date? It changes
 * nothing and never refuses a deadline; the sender decides. Assignees must be active staff of the sender's school.
 */
export async function checkTaskFeasibility(actor: SessionUser, input: FeasibilityRequest, clock: Clock): Promise<FeasibilityResponse> {
  const db = getPool();
  const staff = await listActiveStaff(db, actor.schoolId, input.assigneeIds);
  if (staff.length !== input.assigneeIds.length) throw new ValidationError({ assigneeIds: 'invalid_assignee' });
  const plan = await planDelivery(db, actor.schoolId, Boolean(input.urgent), clock);
  const items = await assessAssignees(db, actor.schoolId, {
    staff, calendar: plan.calendar, from: plan.deliverAt, dueOn: input.dueOn, neededMinutes: input.estimatedMinutes,
  });
  return { items };
}
