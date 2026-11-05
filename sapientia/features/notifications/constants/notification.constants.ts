/**
 * Push services the browsers use. A subscription endpoint must be https on one of these hosts (or a subdomain), so a
 * signed-in user cannot make the worker post to an address of their choosing (OWASP A10, server-side request forgery).
 * Chrome and most Chromium browsers: FCM. Firefox: Mozilla autopush. Safari: Apple. Edge on Windows: WNS.
 */
export const PUSH_SERVICE_HOSTS: readonly string[] = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];

export const PUSH_ENDPOINT_MAX = 1000;

/** Outer limit on one send, and the socket idle limit the libraries enforce themselves. */
export const SEND_DEADLINE_MS = 20_000;
export const SOCKET_TIMEOUT_MS = 10_000;

/** In-process retries for a temporary failure; after that the pg-boss job is retried with its own, longer backoff. */
export const SEND_RETRY = { attempts: 3, baseDelayMs: 1_000, maxDelayMs: 8_000 } as const;

/** A push the device cannot receive within a day is dropped by the push service; by then the email has done the job. */
export const PUSH_TTL_SECONDS = 24 * 60 * 60;
