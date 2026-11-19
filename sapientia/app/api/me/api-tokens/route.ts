import { requireUser } from '@/features/auth/server/current-user.service';
import { newApiTokenSchema } from '@/features/mcp/schemas/api-token.schemas';
import { createMyToken, listMyTokens } from '@/features/mcp/server/api-tokens.service';
import { publicOrigin, readJson, withApi } from '@/shared/server/api-handler';
import { appClock } from '@/shared/server/clock.service';

/** GET /api/me/api-tokens: my active access tokens for AI assistants (never the tokens themselves), and the MCP address. */
export const GET = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  return Response.json(await listMyTokens(actor, appClock(), publicOrigin(request)));
});

/** POST /api/me/api-tokens: { name, password }. The answer is the only time the token is shown. 404 while MCP is off. */
export const POST = withApi(async (request) => {
  const actor = await requireUser(request, appClock());
  const input = await readJson(request, newApiTokenSchema);
  return Response.json(await createMyToken(actor, input, appClock()), { status: 201 });
});
