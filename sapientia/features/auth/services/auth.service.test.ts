import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/api-client';
import { checkLoginFields, isEmailIdentifier, loginFailureReason } from './auth.service';

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

describe('login failure reason', () => {
  it('says wrong email or password only for invalid_credentials', () => {
    expect(loginFailureReason(new ApiError(401, 'invalid_credentials'))).toBe('badCredentials');
    expect(loginFailureReason(new ApiError(429, 'rate_limited'))).toBe('rateLimited');
    expect(loginFailureReason(new ApiError(0, 'network'))).toBe('networkError');
    expect(loginFailureReason(new TypeError('Failed to fetch'))).toBe('networkError');
  });

  it('leaves a server fault or a refused request to the shared error texts', () => {
    expect(loginFailureReason(new ApiError(500, 'internal', {}, 'req-1'))).toBeNull();
    expect(loginFailureReason(new ApiError(400, 'validation', { email: 'invalid_email' }))).toBeNull();
    expect(loginFailureReason(new ApiError(403, 'csrf'))).toBeNull();
  });
});
