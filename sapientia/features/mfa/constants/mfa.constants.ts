/** Two-step sign-in (plan gate G6). Values follow RFC 6238 defaults, which every common authenticator app uses. */

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Steps either side of now that still count, for a phone clock a little out: 30 seconds each way. */
export const TOTP_WINDOW_STEPS = 1;
/** 160 bits, as RFC 4226 recommends for HMAC-SHA1. */
export const TOTP_SECRET_BYTES = 20;
/** The name the authenticator app shows above the code. */
export const TOTP_ISSUER = 'Sapientia';

export const RECOVERY_CODE_COUNT = 10;

/** The step between the password and the code. */
export const MFA_CHALLENGE_COOKIE = 'sapientia_mfa';
export const MFA_CHALLENGE_MINUTES = 5;
/** Wrong codes allowed on one challenge before the person must start again with their password. */
export const MFA_CHALLENGE_MAX_ATTEMPTS = 5;
