/** Every access token starts with this, so one pasted somewhere it should not be is easy to spot and scan for. */
export const API_TOKEN_PREFIX = 'sap_';

/** A token stops working this many days after it is made; the person makes a new one if they still need it. */
export const API_TOKEN_DAYS = 90;

/** Active tokens per person: one per assistant or device is plenty. */
export const API_TOKENS_MAX = 5;

export const API_TOKEN_NAME_MAX = 40;

/** last_used_at is written at most this often, so a busy assistant does not write on every call. */
export const API_TOKEN_TOUCH_MINUTES = 5;

/** The most rows one MCP tool call returns. */
export const MCP_LIST_LIMIT_MAX = 50;
export const MCP_LIST_LIMIT_DEFAULT = 20;

/** The server's name and version as MCP clients see them. */
export const MCP_SERVER_INFO = { name: 'sapientia', version: '1.0.0' } as const;
