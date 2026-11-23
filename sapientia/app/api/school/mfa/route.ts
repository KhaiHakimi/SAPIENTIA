import { requireUser } from '@/features/auth/server/current-user.service';
import { mfaRequirementSchema } from '@/features/mfa/schemas/mfa.schemas';
import { setAdminMfaRequirement } from '@/features/mfa/server/mfa.service';
import { readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/**
 * PUT /api/school/mfa: { requiredForAdmins, password } → 200 with the caller's status. Administrators only, with their password
 * again (400 wrong_password); to require it they must have it on themselves (409 enrol_first). Administrators without it are
 * then asked to set it up before anything else.
 */
export const PUT = withApi(async (request) => {
  const actor = await requireUser(request, appClock(), ['admin']);
  const input = await readJson(request, mfaRequirementSchema);
  return Response.json(await setAdminMfaRequirement(actor, input, appClock()));
});
