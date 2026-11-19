/**
 * The parts of the proposed WebMCP browser API (navigator.modelContext) this experiment uses. The proposal is still a draft
 * and browsers differ, so every member is optional and checked before use.
 */
export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}

export interface WebModelContext {
  registerTool?: (tool: WebMcpTool) => unknown;
  unregisterTool?: (name: string) => void;
  provideContext?: (context: { tools: WebMcpTool[] }) => void;
  clearContext?: () => void;
}
