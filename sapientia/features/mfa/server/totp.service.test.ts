import { describe, expect, it } from 'vitest';
import { fromBase32, hotp, matchTotp, otpauthUri, toBase32, totpStep } from './totp.service';

/** RFC 6238 Appendix B and RFC 4226 Appendix D use the ASCII secret "12345678901234567890". */
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');

describe('TOTP', () => {
  it('matches the RFC 4226 HOTP test values', () => {
    const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
    expected.forEach((code, counter) => expect(hotp(RFC_SECRET, counter)).toBe(code));
  });

  it('matches the RFC 6238 SHA-1 test values (last 6 digits)', () => {
    const cases: [number, string][] = [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924']];
    for (const [seconds, eightDigits] of cases) {
      expect(hotp(RFC_SECRET, totpStep(new Date(seconds * 1000)), 8)).toBe(eightDigits);
    }
  });

  it('round-trips base32 and reads the RFC 4648 example', () => {
    expect(toBase32(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
    expect(fromBase32('mzxw 6ytb-oi').toString()).toBe('foobar');
    expect(fromBase32(toBase32(RFC_SECRET))).toEqual(RFC_SECRET);
  });

  it('accepts a code one step either side of now, never an older or replayed step', () => {
    const now = new Date(1_111_111_111_000);
    const step = totpStep(now);
    const code = (offset: number) => hotp(RFC_SECRET, step + offset);
    expect(matchTotp(RFC_SECRET, code(0), now, null)).toBe(step);
    expect(matchTotp(RFC_SECRET, code(-1), now, null)).toBe(step - 1);
    expect(matchTotp(RFC_SECRET, code(1), now, null)).toBe(step + 1);
    expect(matchTotp(RFC_SECRET, code(-2), now, null)).toBeNull();
    expect(matchTotp(RFC_SECRET, code(0), now, step)).toBeNull();
    expect(matchTotp(RFC_SECRET, '12345', now, null)).toBeNull();
    expect(matchTotp(RFC_SECRET, 'abcdef', now, null)).toBeNull();
  });

  it('builds the otpauth link authenticator apps read', () => {
    const uri = otpauthUri(Buffer.from('foobar'), 'guru@sekolah.test', 'SMK Contoh');
    expect(uri).toBe(
      'otpauth://totp/Sapientia%20(SMK%20Contoh)%3Aguru%40sekolah.test?secret=MZXW6YTBOI&issuer=Sapientia&algorithm=SHA1&digits=6&period=30',
    );
  });
});
