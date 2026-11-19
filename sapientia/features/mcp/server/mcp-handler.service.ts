import 'server-only';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { publicOrigin } from '@/shared/server/api-handler';
import { logger } from '@/shared/server/logger.service';
import { resolveApiToken } from './api-tokens.service';
import { isMcpEnabled } from './mcp-config.service';
import { createMcpServer } from './mcp-tools.service';

const MAX_BODY_BYTES = 64 * 1024;
/** JSON-RPC "server error" range, as the MCP transport uses for refusals before a request is read. */
const REFUSED = -32001;

function refusal(status: number, message: string, headers: Record<string, string>): Response {
  return Response.json({ jsonrpc: '2.0', error: { code: REFUSED, message }, id: null }, { status, headers });
}

function bearerToken(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '');
  return match ? match[1] : null;
}

/**
 * /api/mcp: the MCP server over Streamable HTTP, stateless, answering in JSON (plan Phase 6). Off unless MCP_SERVER=on (404).
 * Only a bearer access token signs in here; the session cookie is ignored, so a web page cannot ride a signed-in browser
 * into it, and a browser Origin other than this site's is refused (DNS rebinding). Each request gets a fresh server bound to
 * the token's owner. Request and answer bodies are never logged.
 */
export async function handleMcpRequest(request: Request, clock: Clock): Promise<Response> {
  const requestId = crypto.randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };
  if (!isMcpEnabled()) return new Response(null, { status: 404, headers });

  const origin = request.headers.get('origin');
  if (origin && origin !== publicOrigin(request)) return refusal(403, 'This origin may not use the MCP server.', headers);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return refusal(413, 'The request body is too large.', headers);

  const token = bearerToken(request);
  const actor = token ? await resolveApiToken(token, clock) : null;
  if (!actor) {
    return refusal(401, 'Send a Sapientia access token as "Authorization: Bearer <token>".', { ...headers, 'WWW-Authenticate': 'Bearer realm="sapientia"' });
  }
  if (actor.mfaSetupRequired) return refusal(403, 'Set up two-step sign-in in Sapientia first.', headers);

  const server = createMcpServer(actor, clock);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    logger.info('mcp.request', { requestId, userId: actor.id, schoolId: actor.schoolId, status: response.status });
    const answer = new Response(response.body, { status: response.status, headers: response.headers });
    for (const [key, value] of Object.entries(headers)) answer.headers.set(key, value);
    return answer;
  } catch (error) {
    logger.error('mcp.unexpected', { requestId, error });
    return refusal(500, 'Something went wrong. Quote the request id if you report it.', headers);
  } finally {
    await server.close();
  }
}
