import type { ApiErrorBody, ApiErrorCode } from '@/shared/interfaces/api-error.interface';

/** Every request gives up after this long, so a dead connection shows an error instead of a spinner forever. */
const REQUEST_TIMEOUT_MS = 15_000;
/** Uploads get longer: 10 MB on a slow school connection can take a minute. */
const UPLOAD_TIMEOUT_MS = 120_000;

/** A failed API call: the server's error code and field reasons, or 'network' when no answer came back. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | 'network',
    readonly fields: Record<string, string> = {},
    readonly requestId?: string,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Same-origin call with the session cookie: a JSON body, or a FormData for an upload (the browser sets its multipart type).
 * Resolves the parsed body (undefined for 204), rejects with ApiError.
 */
export async function apiFetch<T>(path: string, request: ApiRequest = {}): Promise<T> {
  const isForm = request.body instanceof FormData;
  const timeout = AbortSignal.timeout(isForm ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(path, {
      method: request.method ?? 'GET',
      credentials: 'same-origin',
      headers: { ...(request.body === undefined || isForm ? {} : { 'Content-Type': 'application/json' }), ...request.headers },
      body: isForm ? (request.body as FormData) : request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: request.signal ? AbortSignal.any([request.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (request.signal?.aborted) throw error;
    throw new ApiError(0, 'network');
  }
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as { error?: ApiErrorBody } | null)?.error;
    throw new ApiError(response.status, error?.code ?? 'internal', error?.fields ?? {}, error?.requestId);
  }
  return body as T;
}
