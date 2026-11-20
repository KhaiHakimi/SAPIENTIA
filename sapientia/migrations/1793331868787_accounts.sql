-- Up Migration
-- Sprint 2: staff accounts, sessions, invites and sign-in throttling. Students and guardians come in Phase 4.

-- admin: manages users, school settings and the calendar. sender: creates tasks (principal, senior assistants).
-- teacher: receives tasks. One role per account; a sender can also be assigned tasks.
CREATE TYPE user_role AS ENUM ('admin', 'sender', 'teacher');
-- invited: has an invite but no password yet. disabled: cannot sign in; the row stays for the audit trail.
CREATE TYPE user_status AS ENUM ('invited', 'active', 'disabled');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  email text NOT NULL,
  name text NOT NULL,
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'invited',
  -- argon2id in PHC string form; NULL until the invite is accepted.
  password_hash text,
  last_sign_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (btrim(email) <> ''),
  CONSTRAINT users_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT users_active_has_password CHECK (status <> 'active' OR password_hash IS NOT NULL),
  -- Lets child tables carry (school_id, user_id) foreign keys, so a row can never point at another school's user.
  CONSTRAINT users_school_id_id_unique UNIQUE (school_id, id)
);

-- One account per email across all schools: sign-in has only the email to go on.
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
CREATE INDEX users_school_name ON users (school_id, name);

-- The cookie holds a random token; only its SHA-256 is stored, so a leaked table cannot be replayed as sessions.
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash bytea NOT NULL UNIQUE,
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  -- Absolute limit; the idle limit is checked against last_seen_at in code.
  expires_at timestamptz NOT NULL,
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);

CREATE INDEX sessions_user ON sessions (user_id);
CREATE INDEX sessions_expires ON sessions (expires_at);

-- One-time invite tokens, stored as SHA-256 like sessions. Accepting sets used_at; a new invite revokes older open ones.
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash bytea NOT NULL UNIQUE,
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (school_id, created_by) REFERENCES users (school_id, id)
);

CREATE INDEX invites_open_by_user ON invites (user_id) WHERE used_at IS NULL AND revoked_at IS NULL;

-- Failed sign-in counters per key ('ip:<address>' or 'email:<lower email>') in a fixed window. Kept in the database so the
-- web process stays stateless and every instance sees the same counts.
CREATE TABLE auth_throttle (
  key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  failures integer NOT NULL DEFAULT 0
);

-- Down Migration
DROP TABLE auth_throttle;
DROP TABLE invites;
DROP TABLE sessions;
DROP TABLE users;
DROP TYPE user_status;
DROP TYPE user_role;
