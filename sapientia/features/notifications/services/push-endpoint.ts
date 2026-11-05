import { PUSH_ENDPOINT_MAX, PUSH_SERVICE_HOSTS } from '../constants/notification.constants';

/** True when url is an https address on a known push service, with no credentials or unusual port. */
export function isAllowedPushEndpoint(url: string): boolean {
  if (url.length > PUSH_ENDPOINT_MAX) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' || parsed.port !== '' || parsed.username !== '' || parsed.password !== '') return false;
  const host = parsed.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
