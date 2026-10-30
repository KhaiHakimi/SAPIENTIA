import 'server-only';
import type { z } from 'zod';
import type { ApiErrorBody } from '@/shared/interfaces/api-error.interface';
import { AppError, ConflictError, CsrfError, RateLimitError, ValidationError } from './app-errors';
import { logger } from './logger.service';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_BODY_BYTES = 64 * 1024;

export interface ApiContext {
  requestId: string;
}

/**
 * Wraps a route handler: refuses cross-site writes, turns AppErrors into JSON with their status, hides anything unexpected
 * behind a 500, and logs every failure with a request id the user can quote.
 */
export function withApi<C>(handler: (request: Request, context: C, api: ApiContext) => Promise<Response>) {
  return async (request: Request, context: C): Promise<Response> => {
    const api: ApiContext = { requestId: crypto.randomUUID() };
    const started = performance.now();
    try {
      if (UNSAFE_METHODS.has(request.method)) assertSameOrigin(request);
      const response = await handler(request, context, api);
      response.headers.set('X-Request-Id', api.requestId);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch (error) {
      return errorResponse(request, error, api, performance.now() - started);
    }
  };
}

function errorResponse(request: Request, error: unknown, api: ApiContext, elapsedMs: number): Response {
  // Two requests racing past the same uniqueness check: the database's unique index is the real guard.
  if ((error as { code?: unknown })?.code === '23505') error = new ConflictError('This already exists.');
  const path = new URL(request.url).pathname;
  const headers: Record<string, string> = { 'X-Request-Id': api.requestId, 'Cache-Control': 'no-store' };
  if (error instanceof AppError) {
    if (error.status >= 500) logger.error('api.error', { path, method: request.method, requestId: api.requestId, error });
    else logger.info('api.refused', { path, method: request.method, requestId: api.requestId, code: error.code, ms: Math.round(elapsedMs) });
    if (error instanceof RateLimitError) headers['Retry-After'] = String(error.retryAfterSeconds);
    const body: ApiErrorBody = { code: error.code, message: error.message, fields: error.fields, requestId: api.requestId };
    return Response.json({ error: body }, { status: error.status, headers });
  }
  logger.error('api.unexpected', { path, method: request.method, requestId: api.requestId, error });
  const body: ApiErrorBody = { code: 'internal', message: 'Something went wrong. Quote the request id if you report it.', requestId: api.requestId };
  return Response.json({ error: body }, { status: 500, headers });
}

/**
 * CSRF defence for cookie-authenticated writes, on top of SameSite=Lax: the browser's Origin must be this site. APP_ORIGIN
 * names the public origin when a proxy sits in front; otherwise the request's own origin is used.
 */
function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const expected = process.env.APP_ORIGIN?.trim() || new URL(request.url).origin;
  if (origin) {
    if (origin !== expected) throw new CsrfError();
    return;
  }
  // Some browsers omit Origin on same-origin requests; Fetch Metadata still says where the request came from.
  if (request.headers.get('sec-fetch-site') !== 'same-origin') throw new CsrfError();
}

/** Reads and validates a JSON body. Unknown fields are rejected by the schemas (z.strictObject). */
export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new ValidationError({ body: 'json_required' }, 'Send the body as application/json.');
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ValidationError({ body: 'too_large' }, 'The request body is too large.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ValidationError({ body: 'invalid_json' }, 'The request body is not valid JSON.');
  }
  return parseWith(schema, raw);
}

/** Validates query-string parameters with the same schemas and error shape as bodies. */
export function readQuery<S extends z.ZodType>(request: Request, schema: S): z.infer<S> {
  return parseWith(schema, Object.fromEntries(new URL(request.url).searchParams));
}

function parseWith<S extends z.ZodType>(schema: S, raw: unknown): z.infer<S> {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : 'body';
    // First problem per field only; the message is a code the client translates.
    fields[key] ??= issue.message;
  }
  throw new ValidationError(fields);
}

/** Reads one cookie from the request header. */
export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return null;
}

/** The client address as the nearest proxy reported it. Only trustworthy behind a proxy that overwrites the header. */
export function clientAddress(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** The site's public origin for links in responses: APP_ORIGIN behind a proxy, otherwise the request's own origin. */
export function publicOrigin(request: Request): string {
  return process.env.APP_ORIGIN?.trim() || new URL(request.url).origin;
}
