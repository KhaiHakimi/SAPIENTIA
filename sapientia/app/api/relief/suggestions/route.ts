import { requireUser } from '@/features/auth/server/current-user.service';
import { reliefSuggestionsQuerySchema } from '@/features/relief/schemas/relief.schemas';
import { suggestRelief } from '@/features/relief/server/relief.service';
import { readQuery, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * GET /api/relief/suggestions?slotId=&onDate=: up to three people free in that period, fewest relief classes this month
 * first. Administrators only. Nothing is saved; a person decides.
 */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const { slotId, onDate } = readQuery(request, reliefSuggestionsQuerySchema);
  return Response.json(await suggestRelief(actor, slotId, onDate, appClock()));
});
