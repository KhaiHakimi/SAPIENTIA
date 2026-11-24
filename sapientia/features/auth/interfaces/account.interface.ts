/** A seeded demo pupil listed on the sign-in page. The password is SEED_PASSWORD from .env, never in the bundle. */
export interface DemoPupil {
  name: string;
  className: string;
  username: string;
}

/** A seeded demo guardian, linked to one of the demo pupils. Same password as the pupils. */
export interface DemoGuardian {
  name: string;
  username: string;
  /** The demo pupil (by username) this guardian is linked to. */
  childUsername: string;
  relationship: 'mother' | 'father';
}

export type LoginFieldError = 'identifierRequired' | 'emailInvalid' | 'passwordRequired';

/** Sign-in failures the login form has its own words for; any other is described by the shared error texts. */
export type LoginFailureReason = 'badCredentials' | 'rateLimited' | 'networkError';

export interface LoginFieldErrors {
  identifier?: LoginFieldError;
  password?: LoginFieldError;
}
