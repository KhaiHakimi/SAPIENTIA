/** The MCP server is off unless MCP_SERVER=on: a school that does not use AI assistants exposes nothing (plan Phase 6). */
export function isMcpEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MCP_SERVER?.trim().toLowerCase() === 'on';
}
