'use client';

import { useEffect } from 'react';
import type { ReliefDuty } from '@/features/relief/interfaces/relief.interface';
import type { AssignedTask } from '@/features/tasks/interfaces/task.interface';
import { apiFetch } from '@/shared/api/api-client';
import type { Page } from '@/shared/interfaces/api-error.interface';
import type { WebMcpTool, WebModelContext } from '../interfaces/web-mcp.interface';

/** Built in only when NEXT_PUBLIC_WEBMCP=on at build time; off by default (plan Phase 6: "WebMCP: experiment behind a flag"). */
const ENABLED = process.env.NEXT_PUBLIC_WEBMCP === 'on';

const asText = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] });

/** Read-only tools that call the same API the page uses, with the signed-in browser session. */
const TOOLS: WebMcpTool[] = [
  {
    name: 'list_my_tasks',
    description: 'Tasks given to the signed-in teacher in Sapientia, soonest due first.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => asText((await apiFetch<Page<AssignedTask>>('/api/tasks?view=assigned&limit=50')).items),
  },
  {
    name: 'list_my_relief',
    description: 'The signed-in teacher\'s relief classes from today on.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => asText((await apiFetch<{ items: ReliefDuty[] }>('/api/relief/mine')).items),
  },
];

/**
 * WebMCP experiment: offers an AI agent in the browser two read-only tools while a member of staff has the app open. Does
 * nothing unless the flag is on and the browser has navigator.modelContext; renders nothing either way.
 */
export function WebMcpTools() {
  useEffect(() => {
    if (!ENABLED) return;
    const context = (navigator as Navigator & { modelContext?: WebModelContext }).modelContext;
    if (!context) return;
    if (context.registerTool) {
      for (const tool of TOOLS) context.registerTool(tool);
      return () => TOOLS.forEach((tool) => context.unregisterTool?.(tool.name));
    }
    if (context.provideContext) {
      context.provideContext({ tools: TOOLS });
      return () => context.clearContext?.();
    }
  }, []);
  return null;
}
