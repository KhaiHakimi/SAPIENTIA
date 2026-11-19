import { createHmac, randomBytes } from 'node:crypto';
import { TOTP_DIGITS, TOTP_ISSUER, TOTP_SECRET_BYTES, TOTP_STEP_SECONDS, TOTP_WINDOW_STEPS } from '../constants/mfa.constants';

/**
 * Time-based one-time codes (RFC 6238 over RFC 4226, HMAC-SHA1, 6 digits, 30 seconds): what Google Authenticator, Microsoft
 * Authenticator and similar apps produce. Pure functions of a secret and an instant; node:crypto only.
 */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32 without padding: the form authenticator apps take a key in. */
export function toBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function fromBase32(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error('Not base32.');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): Buffer {
  return randomBytes(TOTP_SECRET_BYTES);
}

/** The time step an instant falls in. */
export function totpStep(instant: Date): number {
  return Math.floor(instant.getTime() / 1000 / TOTP_STEP_SECONDS);
}

/** RFC 4226 HOTP: dynamic truncation of HMAC-SHA1 over the 8-byte counter. */
export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, '0');
}

/**
 * The step a code belongs to, within TOTP_WINDOW_STEPS of now and after the last step already used, or null. Refusing a step
 * at or before lastUsedStep stops the same code (or an older one) from being replayed.
 */
export function matchTotp(secret: Buffer, code: string, now: Date, lastUsedStep: number | null): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = totpStep(now);
  for (let offset = -TOTP_WINDOW_STEPS; offset <= TOTP_WINDOW_STEPS; offset += 1) {
    const step = current + offset;
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    if (hotp(secret, step) === code) return step;
  }
  return null;
}

/** The otpauth:// link an authenticator app reads; the label is the school's name and the account's email. */
export function otpauthUri(secret: Buffer, account: string, schoolName: string): string {
  const label = encodeURIComponent(`${TOTP_ISSUER} (${schoolName}):${account}`);
  const query = new URLSearchParams({
    secret: toBase32(secret), issuer: TOTP_ISSUER, algorithm: 'SHA1', digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
