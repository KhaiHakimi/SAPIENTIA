import type { ApiErrorCode } from '@/shared/interfaces/api-error.interface';

/** An expected failure with a status and a code the client can act on. Anything else becomes a 500 with no detail. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Also used when the caller may not see the record: a refusal looks the same as a missing row (plan: 404, not 403). */
export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(404, 'not_found', message);
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>, message = 'Some fields are not valid.') {
    super(400, 'validation', message, fields);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(409, 'conflict', message, fields);
  }
}

export class UnauthenticatedError extends AppError {
  constructor() {
    super(401, 'unauthenticated', 'Sign in to continue.');
  }
}

/** One message for an unknown email, a wrong password, and an account that cannot sign in (plan rule 3). */
export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, 'invalid_credentials', 'The email or password is not correct.');
  }
}

export class RateLimitError extends AppError {
  constructor(readonly retryAfterSeconds: number) {
    super(429, 'rate_limited', 'Too many attempts. Try again later.');
  }
}

export class CsrfError extends AppError {
  constructor() {
    super(403, 'csrf', 'Request refused: it did not come from this site.');
  }
}

/** The school's own settings make the request impossible (for example a calendar with no working days). */
export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(422, 'configuration', message);
  }
}

/** A pupil signed in with the starting password on their slip: nothing opens until they choose their own. */
export class PasswordChangeRequiredError extends AppError {
  constructor() {
    super(403, 'password_change_required', 'Choose your own password first.');
  }
}

/** The school requires two-step sign-in for administrators and this one has not set it up: only the setup opens. */
export class MfaSetupRequiredError extends AppError {
  constructor() {
    super(403, 'mfa_setup_required', 'Set up two-step sign-in first.');
  }
}

/** AI is switched off on this server, or the model could not be reached: the form works without it. */
export class AiUnavailableError extends AppError {
  constructor() {
    super(503, 'ai_unavailable', 'The AI assistant is not available.');
  }
}

/** The model answered, but nothing usable survived validation. Its answer is untrusted and is never passed on. */
export class AiBadOutputError extends AppError {
  constructor() {
    super(502, 'ai_bad_output', 'The AI assistant could not draft from this instruction.');
  }
}

/** The server has no MFA_ENCRYPTION_KEY, so it cannot keep an authenticator secret safely. */
export class MfaUnavailableError extends AppError {
  constructor() {
    super(503, 'mfa_unavailable', 'Two-step sign-in is not available on this server.');
  }
}
