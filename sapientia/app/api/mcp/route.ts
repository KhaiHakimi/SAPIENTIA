import { handleMcpRequest } from '@/features/mcp/server/mcp-handler.service';
import { appClock } from '@/shared/server/clock.service';

/**
 * The read-only MCP server (plan Phase 6), for AI assistants acting as one member of staff with a personal access token.
 * POST carries JSON-RPC; GET and DELETE answer 405 because the server is stateless (no event stream, no sessions).
 */
export const POST = (request: Request) => handleMcpRequest(request, appClock());
export const GET = (request: Request) => handleMcpRequest(request, appClock());
export const DELETE = (request: Request) => handleMcpRequest(request, appClock());
