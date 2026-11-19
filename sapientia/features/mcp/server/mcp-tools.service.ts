import 'server-only';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import { listMyReliefDuties } from '@/features/relief/server/relief.service';
import { ASSIGNMENT_STATUSES } from '@/features/tasks/constants/task.constants';
import { getTask, listAssignedTasks, listSentTasks } from '@/features/tasks/server/tasks.service';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { NotFoundError } from '@/shared/server/app-errors';
import { MCP_LIST_LIMIT_DEFAULT, MCP_LIST_LIMIT_MAX, MCP_SERVER_INFO } from '../constants/mcp.constants';

const READ_ONLY: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const limitSchema = z.number().int().min(1).max(MCP_LIST_LIMIT_MAX).optional()
  .describe(`How many to return, 1 to ${MCP_LIST_LIMIT_MAX} (default ${MCP_LIST_LIMIT_DEFAULT}).`);

const asJson = (value: unknown): CallToolResult => ({ content: [{ type: 'text', text: JSON.stringify(value) }] });

/**
 * The MCP server's tools (plan Phase 6), bound to one person for one request. Every tool calls the same service function a
 * page of the app calls, with that person as the actor, so it sees exactly what they would see and no more. All are
 * read-only, and none reaches pupil, guardian, homework or bullying records: the server offers staff task work only.
 */
export function createMcpServer(actor: SessionUser, clock: Clock): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions: 'Read-only access to the signed-in teacher\'s own Sapientia tasks and relief duties. Dates are YYYY-MM-DD in the '
      + `school's time zone (${actor.timeZone}). Nothing can be changed through this server.`,
  });

  server.registerTool('list_my_tasks', {
    title: 'My tasks',
    description: 'Tasks given to me that have reached me, soonest due first, with my status and my own due date.',
    inputSchema: { status: z.enum(ASSIGNMENT_STATUSES).optional().describe('Only tasks in this column of my board.'), limit: limitSchema },
    annotations: READ_ONLY,
  }, async ({ status, limit }) => asJson((await listAssignedTasks(actor, status, limit ?? MCP_LIST_LIMIT_DEFAULT, undefined)).items));

  server.registerTool('get_task', {
    title: 'One task',
    description: 'One task I was given or sent: details, comments, extension requests; the sender also sees who has finished.',
    inputSchema: { taskId: z.uuid().describe('The task id, from list_my_tasks or list_sent_tasks.') },
    annotations: READ_ONLY,
  }, async ({ taskId }) => {
    try {
      return asJson(await getTask(actor, taskId));
    } catch (error) {
      if (error instanceof NotFoundError) {
        return { isError: true, content: [{ type: 'text', text: 'No such task, or it is not yours to see.' }] };
      }
      throw error;
    }
  });

  server.registerTool('list_sent_tasks', {
    title: 'Tasks I sent',
    description: 'Tasks I sent, newest first, with how many people have finished. heldOnly lists those still waiting for working hours.',
    inputSchema: { heldOnly: z.boolean().optional().describe('Only tasks still held until working hours.'), limit: limitSchema },
    annotations: READ_ONLY,
  }, async ({ heldOnly, limit }) =>
    asJson((await listSentTasks(actor, limit ?? MCP_LIST_LIMIT_DEFAULT, undefined, heldOnly ?? false)).items));

  server.registerTool('list_my_relief', {
    title: 'My relief classes',
    description: 'My relief duties from today on: date, time, class and subject. Duties not yet delivered are not listed.',
    annotations: READ_ONLY,
  }, async () => asJson(await listMyReliefDuties(actor, clock)));

  return server;
}
