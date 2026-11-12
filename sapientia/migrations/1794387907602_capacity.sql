-- Up Migration
-- Sprint 6 (Phase 2, capacity): the school's subjects and classes, each teacher's weekly timetable, task types with a time
-- estimate, and the estimate and flagged-deadline marker on tasks.
-- Sprint 7 (folded in before release): extension requests and a per-assignee due date.

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subjects_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT subjects_school_id_id_unique UNIQUE (school_id, id)
);
CREATE UNIQUE INDEX subjects_name_unique ON subjects (school_id, lower(name));

-- A teaching group such as "4 Bestari". Students join classes in Phase 4; for now a class is only a name on the timetable.
CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classes_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT classes_school_id_id_unique UNIQUE (school_id, id)
);
CREATE UNIQUE INDEX classes_name_unique ON classes (school_id, lower(name));

-- A kind of task with the time it usually takes ("Key in exam marks: 90 minutes"), so senders need not guess each time.
-- Archived, not deleted, because tasks keep pointing at the type they were created with.
CREATE TABLE task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  name text NOT NULL,
  estimated_minutes integer NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_types_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT task_types_estimate_range CHECK (estimated_minutes BETWEEN 5 AND 6000),
  CONSTRAINT task_types_school_id_id_unique UNIQUE (school_id, id)
);
CREATE UNIQUE INDEX task_types_name_unique ON task_types (school_id, lower(name)) WHERE archived_at IS NULL;

-- The timetable is stored as weekly recurring periods and expanded into busy time in code (plan Phase 2): there is no row
-- per date. A period is a lesson (class and subject) or another fixed duty with a label (assembly, duty roster).
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE time_range AS RANGE (subtype = time);

CREATE TABLE timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  teacher_id uuid NOT NULL,
  -- ISO weekday: 1 Monday ... 7 Sunday, as in school_settings.weekend_days.
  weekday smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  class_id uuid,
  subject_id uuid,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timetable_slots_weekday CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT timetable_slots_times CHECK (start_time < end_time),
  CONSTRAINT timetable_slots_label_length CHECK (label IS NULL OR char_length(btrim(label)) BETWEEN 1 AND 80),
  CONSTRAINT timetable_slots_lesson_or_duty CHECK ((class_id IS NOT NULL AND subject_id IS NOT NULL) OR label IS NOT NULL),
  -- One teacher cannot be in two places: the database refuses overlapping periods even if two requests race.
  CONSTRAINT timetable_slots_no_overlap EXCLUDE USING gist (teacher_id WITH =, weekday WITH =, time_range(start_time, end_time) WITH &&),
  FOREIGN KEY (school_id, teacher_id) REFERENCES users (school_id, id),
  FOREIGN KEY (school_id, class_id) REFERENCES classes (school_id, id),
  FOREIGN KEY (school_id, subject_id) REFERENCES subjects (school_id, id)
);
CREATE INDEX timetable_slots_teacher ON timetable_slots (school_id, teacher_id, weekday, start_time);

-- estimated_minutes is the sender's estimate for one assignee; without it there is nothing to check a deadline against.
-- deadline_flagged records that the sender was warned the time does not exist and sent the task anyway (warn, never block).
ALTER TABLE tasks
  ADD COLUMN task_type_id uuid,
  ADD COLUMN estimated_minutes integer,
  ADD COLUMN deadline_flagged boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT tasks_estimate_range CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 5 AND 6000),
  ADD CONSTRAINT tasks_flag_needs_estimate CHECK (NOT deadline_flagged OR estimated_minutes IS NOT NULL),
  ADD CONSTRAINT tasks_task_type_fk FOREIGN KEY (school_id, task_type_id) REFERENCES task_types (school_id, id);

-- An extension gives one assignee more time without moving the date for everyone else: null means the task's own due date.
ALTER TABLE task_assignments ADD COLUMN due_on date;

-- approved: the sender accepted the date asked for. countered: the sender set a different date instead.
CREATE TYPE extension_status AS ENUM ('pending', 'approved', 'countered');

-- The exchange is kept on the task (plan Phase 2): who asked for what, and what was decided. Rows are never edited after
-- the decision; a teacher who needs longer still asks again.
CREATE TABLE extension_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  task_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  -- The assignee's due date when they asked, so the exchange still reads correctly after the date has moved.
  current_due_on date NOT NULL,
  requested_due_on date NOT NULL,
  reason text,
  -- What the capacity check said when they asked: the task's estimate and the free working time left before the due date.
  -- Totals only, so the sender sees why without seeing the teacher's other work. Null when the task has no estimate.
  needed_minutes integer,
  free_minutes integer,
  status extension_status NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  -- The date granted: the requested date when approved, the sender's own when countered.
  decided_due_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT extension_requests_later CHECK (requested_due_on > current_due_on),
  CONSTRAINT extension_requests_reason_length CHECK (reason IS NULL OR char_length(btrim(reason)) BETWEEN 1 AND 500),
  CONSTRAINT extension_requests_figures CHECK (
    (needed_minutes IS NULL AND free_minutes IS NULL) OR (needed_minutes > 0 AND free_minutes >= 0)
  ),
  CONSTRAINT extension_requests_decision CHECK (
    (status = 'pending' AND decided_by IS NULL AND decided_at IS NULL AND decided_due_on IS NULL)
    OR (status <> 'pending' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND decided_due_on IS NOT NULL)
  ),
  FOREIGN KEY (school_id, task_id) REFERENCES tasks (school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (task_id, requested_by) REFERENCES task_assignments (task_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (school_id, decided_by) REFERENCES users (school_id, id)
);
-- One open request per person per task: a second tap cannot queue a duplicate.
CREATE UNIQUE INDEX extension_requests_one_pending ON extension_requests (task_id, requested_by) WHERE status = 'pending';
CREATE INDEX extension_requests_task ON extension_requests (school_id, task_id, created_at);

-- Down Migration
DROP TABLE extension_requests;
DROP TYPE extension_status;
ALTER TABLE task_assignments DROP COLUMN due_on;
ALTER TABLE tasks
  DROP CONSTRAINT tasks_task_type_fk,
  DROP CONSTRAINT tasks_flag_needs_estimate,
  DROP CONSTRAINT tasks_estimate_range,
  DROP COLUMN deadline_flagged,
  DROP COLUMN estimated_minutes,
  DROP COLUMN task_type_id;
DROP TABLE timetable_slots;
DROP TYPE time_range;
DROP TABLE task_types;
DROP TABLE classes;
DROP TABLE subjects;
