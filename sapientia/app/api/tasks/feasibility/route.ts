import { DateTime } from 'luxon';
import { requireUser } from '@/features/auth/server/current-user.service';
import { feasibilityRequestSchema } from '@/features/capacity/schemas/capacity.schemas';
import { checkTaskFeasibility } from '@/features/capacity/server/feasibility.service';
import { isBeyondDueHorizon } from '@/features/delivery/services/due-horizon.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { ValidationError } from '@/shared/server/app-errors';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/tasks/feasibility: { assigneeIds, dueOn, estimatedMinutes, urgent? }. A dry run: for each assignee, whether the
 * time exists by the due date after teaching and the work they already have, and the earliest realistic date. Nothing is
 * saved. Senders and administrators only. A due date further ahead than creating the task allows is refused the same way.
 */
export const POST = withApi(async (request) => {
  const clock = appClock();
  const actor = await requireUser(request, clock, ['admin', 'sender']);
  const input = await readJson(request, feasibilityRequestSchema);
  const today = DateTime.fromJSDate(clock.now(), { zone: actor.timeZone }).toISODate() ?? '';
  if (isBeyondDueHorizon(input.dueOn, today)) throw new ValidationError({ dueOn: 'too_far_ahead' });
  return Response.json(await checkTaskFeasibility(actor, input, clock));
});
