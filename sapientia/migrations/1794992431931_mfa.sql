-- Up Migration
-- Two-step sign-in for staff (plan gate G6: MFA ready before Phase 5). A member of staff adds an authenticator app (TOTP,
-- RFC 6238). The shared secret is stored encrypted with a key from the environment (MFA_ENCRYPTION_KEY), never in clear;
-- recovery codes are stored as hashes only. A school may require two-step sign-in for its administrators.

ALTER TABLE schools ADD COLUMN require_admin_mfa boolean NOT NULL DEFAULT false;

-- One authenticator per account. confirmed_at is null while the person is still setting it up; only a confirmed row asks for
-- a code at sign-in. last_used_step stops a code from being used twice.
CREATE TABLE user_mfa (
  user_id uuid PRIMARY KEY,
  school_id uuid NOT NULL,
  -- AES-256-GCM: 12-byte nonce, 16-byte tag, then the ciphertext.
  secret_encrypted bytea NOT NULL,
  confirmed_at timestamptz,
  last_used_step bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);

-- One-time codes for a lost phone, shown once. SHA-256 of a random code: the code has enough entropy that a slow hash adds
-- nothing.
CREATE TABLE user_mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  code_hash bytea NOT NULL,
  used_at timestamptz,
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);
CREATE INDEX user_mfa_recovery_codes_user ON user_mfa_recovery_codes (school_id, user_id);

-- The step between a correct password and the code: a short-lived token in its own cookie, not a session.
CREATE TABLE mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash bytea NOT NULL UNIQUE,
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  attempts smallint NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);
CREATE INDEX mfa_challenges_expires ON mfa_challenges (expires_at);

-- Down Migration
DROP TABLE mfa_challenges;
DROP TABLE user_mfa_recovery_codes;
DROP TABLE user_mfa;
ALTER TABLE schools DROP COLUMN require_admin_mfa;
