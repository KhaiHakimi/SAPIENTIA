import { describe, expect, it } from 'vitest';
import { checkLoginFields, isEmailIdentifier } from './auth.service';

describe('login fields', () => {
  it('asks for both fields', () => {
    expect(checkLoginFields('', '')).toEqual({ identifier: 'identifierRequired', password: 'passwordRequired' });
    expect(checkLoginFields('   ', 'x')).toEqual({ identifier: 'identifierRequired' });
  });

  it('accepts a pupil username or a usable staff email', () => {
    expect(checkLoginFields('aisyah0001', 'x')).toEqual({});
    expect(checkLoginFields('  cikgu.aminah@guru.sapientia.test ', 'x')).toEqual({});
    expect(checkLoginFields('cikgu@', 'x')).toEqual({ identifier: 'emailInvalid' });
  });

  it('treats anything with "@" as a staff email', () => {
    expect(isEmailIdentifier('a@b.test')).toBe(true);
    expect(isEmailIdentifier('aisyah0001')).toBe(false);
  });
});
