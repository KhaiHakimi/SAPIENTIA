-- Up Migration
-- Phase 6 (AI and open standards). Every request to the language model is counted here so each person can be held to an
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

-- Down Migration
DROP TABLE ai_requests;
DROP TYPE ai_outcome;
DROP TYPE ai_feature;
