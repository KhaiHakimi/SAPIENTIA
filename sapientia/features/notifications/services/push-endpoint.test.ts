import { describe, expect, it } from 'vitest';
import { isAllowedPushEndpoint } from './push-endpoint';

describe('isAllowedPushEndpoint', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc:def',
    'https://updates.push.services.mozilla.com/wpush/v2/gAAAA',
    'https://web.push.apple.com/QGx1',
    'https://wns2-sg2p.notify.windows.com/w/?token=AwYAAA',
  ])('accepts the push service address %s', (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true);
  });

  it.each([
    ['plain http', 'http://fcm.googleapis.com/fcm/send/abc'],
    ['an internal address', 'https://169.254.169.254/latest/meta-data'],
    ['localhost', 'https://localhost/push'],
    ['a look-alike host', 'https://fcm.googleapis.com.evil.test/send'],
    ['a host that only ends with the name', 'https://evilnotify.windows.com/x'],
    ['a custom port', 'https://fcm.googleapis.com:8443/fcm/send/abc'],
    ['credentials in the URL', 'https://user:pass@fcm.googleapis.com/fcm/send/abc'],
    ['not a URL', 'fcm.googleapis.com/fcm/send'],
    ['an over-long address', `https://fcm.googleapis.com/${'a'.repeat(1000)}`],
  ])('refuses %s', (_, url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false);
  });
});
