import { requireUser } from '@/features/auth/server/current-user.service';
import { feasibilityRequestSchema } from '@/features/capacity/schemas/capacity.schemas';
import { checkTaskFeasibility } from '@/features/capacity/server/feasibility.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/tasks/feasibility: { assigneeIds, dueOn, estimatedMinutes, urgent? }. A dry run: for each assignee, whether the
 * time exists by the due date after teaching and the work they already have, and the earliest realistic date. Nothing is
 * saved. Senders and administrators only.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin', 'sender']);
  const input = await readJson(request, feasibilityRequestSchema);
  return Response.json(await checkTaskFeasibility(actor, input, appClock()));
});
