/** A seeded demo pupil listed on the sign-in page. The password is SEED_PASSWORD from .env, never in the bundle. */
export interface DemoPupil {
  name: string;
  className: string;
  username: string;
}

export type LoginFieldError = 'identifierRequired' | 'emailInvalid' | 'passwordRequired';

export interface LoginFieldErrors {
  identifier?: LoginFieldError;
  password?: LoginFieldError;
}
