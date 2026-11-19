-- Up Migration
-- Phase 6 (AI and open standards).
--
-- Every request to the language model is counted here so each person can be held to an
-- hourly limit and an administrator can see that the feature is used. Only who, when, which feature and the outcome are
-- kept: never the instruction, the model's answer or any name.

CREATE TYPE ai_feature AS ENUM ('task_draft');
CREATE TYPE ai_outcome AS ENUM ('ok', 'bad_output', 'failed');

CREATE TABLE ai_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  feature ai_feature NOT NULL,
  outcome ai_outcome NOT NULL,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);
CREATE INDEX ai_requests_user_recent ON ai_requests (school_id, user_id, created_at);

-- The weekly digest: one email per person on the first working morning of the week, listing their own work. Each person may
-- turn it off. digest_sends records each person's week once (sent, nothing to say, or failed for good), so the sweep that
-- runs every 15 minutes never sends a week twice.
ALTER TABLE users ADD COLUMN weekly_digest boolean NOT NULL DEFAULT true;

CREATE TYPE digest_outcome AS ENUM ('sent', 'empty', 'failed');

CREATE TABLE digest_sends (
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  -- The Monday of the week, in the school's calendar.
  week_of date NOT NULL,
  outcome digest_outcome NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, week_of),
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);

-- Personal access tokens for the read-only MCP server: an AI assistant acts as the person who made the token, with that
-- person's own access and nothing more. Only the SHA-256 of a token is stored; it is shown once. Tokens expire, can be
-- revoked, and end with the account (signing out everywhere revokes them too).
CREATE TABLE api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  token_hash bytea NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);
CREATE INDEX api_tokens_user ON api_tokens (school_id, user_id);

-- Down Migration
DROP TABLE api_tokens;
DROP TABLE digest_sends;
DROP TYPE digest_outcome;
ALTER TABLE users DROP COLUMN weekly_digest;
DROP TABLE ai_requests;
DROP TYPE ai_outcome;
DROP TYPE ai_feature;
