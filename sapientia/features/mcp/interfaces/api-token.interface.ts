/** An access token as its owner sees it in the list. The token itself is never shown again after it is made. */
export interface ApiTokenSummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
}

/**
 * GET /api/me/api-tokens. available is false when the server has the MCP server switched off; the tokens are still listed
 * then, so they can be revoked before it is switched on again.
 */
export interface ApiTokenList {
  available: boolean;
  /** Where an MCP client connects, or null while switched off. */
  endpoint: string | null;
  items: ApiTokenSummary[];
}

/** POST /api/me/api-tokens body: a name to recognise it by, and the password again. */
export interface NewApiTokenRequest {
  name: string;
  password: string;
}

/** POST /api/me/api-tokens answer: the only time the token is shown. */
export interface NewApiToken {
  token: string;
  item: ApiTokenSummary;
}
