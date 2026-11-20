import { requireUser } from '@/features/auth/server/current-user.service';
import { taskDraftRequestSchema } from '@/features/task-drafts/schemas/task-draft.schemas';
import { draftTask } from '@/features/task-drafts/server/task-draft.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * POST /api/ai/task-draft: { instruction }. Senders and administrators. Returns a draft for the create-task form; nothing is
 * saved or sent. 503 ai_unavailable when AI is off or the model cannot be reached, 502 ai_bad_output when its answer is not
 * usable, 429 after the hourly limit.
 */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin', 'sender']);
  const { instruction } = await readJson(request, taskDraftRequestSchema);
  return Response.json(await draftTask(actor, instruction, appClock()));
});
