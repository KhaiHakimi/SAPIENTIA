import { settingsPatchSchema } from '@/features/delivery/schemas/delivery.schemas';
import { getSchoolSettings, updateSchoolSettings } from '@/features/delivery/server/school-settings.service';
import { requireUser } from '@/features/auth/server/current-user.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/school/settings: working hours, weekend (ISO days, 1 Monday) and state. Any signed-in staff member. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  return Response.json(await getSchoolSettings(actor));
});

/** PATCH /api/school/settings: administrators only; send just the fields to change. */
export const PATCH = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const patch = await readJson(request, settingsPatchSchema);
  return Response.json(await updateSchoolSettings(actor, patch, appClock()));
});
