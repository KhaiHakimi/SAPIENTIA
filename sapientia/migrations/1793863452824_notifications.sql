-- Up Migration
-- Sprint 5: tell assignees when a task reaches them, by email and Web Push. Only the worker sends, and only after the task's
-- delivery is saved (plan Sprint 5), so a held task never announces itself early.

-- Email is on unless the person turns it off. Push is on for a device only while that device has a subscription below.
ALTER TABLE users ADD COLUMN notify_by_email boolean NOT NULL DEFAULT true;

-- One row per browser that agreed to push. endpoint is the push service URL the browser gave; p256dh and auth are its
-- public encryption keys (not secrets of ours). A browser keeps one endpoint, so a shared device moves to whoever subscribed
-- last. The endpoint host is checked against known push services before saving, so the worker never posts elsewhere.
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_length CHECK (char_length(endpoint) BETWEEN 1 AND 1000),
  CONSTRAINT push_subscriptions_keys_length CHECK (char_length(p256dh) BETWEEN 1 AND 200 AND char_length(auth) BETWEEN 1 AND 100),
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX push_subscriptions_endpoint_unique ON push_subscriptions (endpoint);
CREATE INDEX push_subscriptions_user ON push_subscriptions (user_id);

CREATE TYPE notification_channel AS ENUM ('email', 'push');

-- What has gone out, so a retried job sends only what is still missing and nobody gets the same message twice.
-- target is 'email' for email and the subscription id for push (one row per device).
CREATE TABLE notification_sends (
  school_id uuid NOT NULL,
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  channel notification_channel NOT NULL,
  target text NOT NULL,
  sent_at timestamptz NOT NULL,
  PRIMARY KEY (task_id, user_id, channel, target),
  FOREIGN KEY (school_id, task_id) REFERENCES tasks (school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);

-- Down Migration
DROP TABLE notification_sends;
DROP TYPE notification_channel;
DROP TABLE push_subscriptions;
ALTER TABLE users DROP COLUMN notify_by_email;
