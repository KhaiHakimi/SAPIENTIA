import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, readMfaKey } from './mfa-secret.service';

describe('the stored authenticator secret', () => {
  const key = randomBytes(32);
  const secret = randomBytes(20);

  it('round-trips, with a different nonce each time', () => {
    const first = encryptSecret(secret, key);
    expect(decryptSecret(first, key)).toEqual(secret);
    expect(encryptSecret(secret, key)).not.toEqual(first);
    expect(first.includes(secret)).toBe(false);
  });

  it('refuses a changed record or the wrong key', () => {
    const stored = encryptSecret(secret, key);
    const changed = Buffer.from(stored);
    changed[changed.length - 1] ^= 1;
    expect(() => decryptSecret(changed, key)).toThrow();
    expect(() => decryptSecret(stored, randomBytes(32))).toThrow();
  });

  it('reads a 32-byte base64 key, treats a missing one as off, and rejects a short one', () => {
    expect(readMfaKey({ MFA_ENCRYPTION_KEY: key.toString('base64') })).toEqual(key);
    expect(readMfaKey({})).toBeNull();
    expect(() => readMfaKey({ MFA_ENCRYPTION_KEY: randomBytes(16).toString('base64') })).toThrow('32 bytes');
  });
});
