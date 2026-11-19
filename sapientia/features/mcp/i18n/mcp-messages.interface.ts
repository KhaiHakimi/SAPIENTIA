/** The "AI assistant access" section of the Security page (plan Phase 6 MCP server). */
export interface McpMessages {
  heading: string;
  intro: string;
  scope: string;
  endpoint: string;
  none: string;
  created: (day: string) => string;
  lastUsed: (day: string) => string;
  neverUsed: string;
  expires: (day: string) => string;
  revoke: (name: string) => string;
  revoked: string;
  newHeading: string;
  name: string;
  nameHelp: string;
  password: string;
  create: string;
  creating: string;
  shownOnce: string;
  tokenLabel: string;
  done: string;
  /** Field reasons worded for this section; anything else falls back to the shared table. */
  fieldErrors: Record<string, string>;
}
