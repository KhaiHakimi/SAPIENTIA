/**
 * One JSON object per line on stdout or stderr. Fields whose names suggest secrets or personal data are replaced before
 * writing, at any depth, so a careless log call cannot leak a password, token, cookie or someone's name or email.
 */
type Level = 'info' | 'warn' | 'error';

const REDACTED = '[redacted]';
const SENSITIVE_KEY = /pass|token|secret|cookie|authorization|email|name|body|comment|description|title|reason/i;
const MAX_DEPTH = 5;

export function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1)]),
  );
}

function write(level: Level, event: string, fields: Record<string, unknown>): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...(redact(fields) as object) });
  if (level === 'info') console.log(line);
  else console.error(line);
}

export const logger = {
  info: (event: string, fields: Record<string, unknown> = {}) => write('info', event, fields),
  warn: (event: string, fields: Record<string, unknown> = {}) => write('warn', event, fields),
  error: (event: string, fields: Record<string, unknown> = {}) => write('error', event, fields),
};
