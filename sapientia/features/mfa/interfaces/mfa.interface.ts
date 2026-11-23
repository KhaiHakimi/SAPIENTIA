/** GET /api/me/mfa: the signed-in person's two-step sign-in. */
export interface MfaStatus {
  /** False when the server has no MFA_ENCRYPTION_KEY: the page explains and offers nothing. */
  available: boolean;
  enabled: boolean;
  recoveryCodesLeft: number;
  /** The school requires it for administrators (shown to everyone; only administrators may change it). */
  requiredForAdmins: boolean;
}

/** POST /api/me/mfa/setup: the key to add to an authenticator app. Shown once; the server keeps it encrypted. */
export interface MfaSetup {
  /** Base32, in groups of four, for typing into the app. */
  key: string;
  /** otpauth:// link, for a phone that opens it or for a QR code. */
  otpauthUri: string;
}

/** POST /api/me/mfa/confirm and POST /api/me/mfa/recovery-codes: one-time codes, shown once. */
export interface MfaRecoveryCodes {
  recoveryCodes: string[];
}

export interface PasswordRequest {
  password: string;
}

export interface MfaCodeRequest {
  code: string;
}

/** POST /api/auth/mfa: the code from the app, or one recovery code. */
export type MfaSignInRequest = { code: string } | { recoveryCode: string };

/** PUT /api/school/mfa: administrators only, with their password again. */
export interface MfaRequirementRequest {
  requiredForAdmins: boolean;
  password: string;
}
