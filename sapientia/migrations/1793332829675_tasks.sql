-- Up Migration
-- Sprint 3: tasks, who they are assigned to, comments, the audit log, and idempotency keys for creating tasks.

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  -- A calendar day in the school's time zone, not an instant: "due Friday" means the whole Friday.
  due_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  CONSTRAINT tasks_description_length CHECK (description IS NULL OR char_length(description) <= 5000),
  CONSTRAINT tasks_school_id_id_unique UNIQUE (school_id, id),
  FOREIGN KEY (school_id, created_by) REFERENCES users (school_id, id)
);

CREATE INDEX tasks_sent ON tasks (school_id, created_by, created_at DESC, id DESC);

-- The four columns of the teacher board.
CREATE TYPE assignment_status AS ENUM ('todo', 'in_progress', 'waiting', 'done');

-- Each assignee moves their own copy of the task; one person finishing does not finish it for the others.
CREATE TABLE task_assignments (
  school_id uuid NOT NULL,
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status assignment_status NOT NULL DEFAULT 'todo',
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (task_id, user_id),
  CONSTRAINT task_assignments_done_has_time CHECK ((status = 'done') = (completed_at IS NOT NULL)),
  FOREIGN KEY (school_id, task_id) REFERENCES tasks (school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id)
);

CREATE INDEX task_assignments_board ON task_assignments (school_id, user_id, status);

-- Comments are append-only in the application: there is no edit or delete endpoint.
CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  task_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_comments_body_length CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  FOREIGN KEY (school_id, task_id) REFERENCES tasks (school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (school_id, author_id) REFERENCES users (school_id, id)
);

CREATE INDEX task_comments_thread ON task_comments (task_id, created_at, id);

-- Who did what, when. Deliberately no foreign keys (plan Section 12, item 4): the trail must outlive anything it mentions.
-- metadata holds ids and states only, never names, emails or free text.
CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity ON audit_logs (school_id, entity_type, entity_id, id);

-- Append-only in the database too, not just in code: any UPDATE or DELETE fails. (TRUNCATE, used by tests, is not a row
-- operation and is not affected.)
CREATE FUNCTION audit_logs_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

CREATE TRIGGER audit_logs_no_update_or_delete BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();

-- A retried POST with the same Idempotency-Key gets the first response back instead of creating a second task.
CREATE TABLE idempotency_keys (
  user_id uuid NOT NULL,
  key text NOT NULL,
  school_id uuid NOT NULL,
  request_hash bytea NOT NULL,
  status_code integer,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key),
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);

CREATE INDEX idempotency_keys_created ON idempotency_keys (created_at);

-- Down Migration
DROP TABLE idempotency_keys;
DROP TRIGGER audit_logs_no_update_or_delete ON audit_logs;
DROP FUNCTION audit_logs_append_only();
DROP TABLE audit_logs;
DROP TABLE task_comments;
DROP TABLE task_assignments;
DROP TYPE assignment_status;
DROP TABLE tasks;
