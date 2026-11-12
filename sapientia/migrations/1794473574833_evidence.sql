-- Up Migration
-- Phase 3, Sprint 9: lesson records and the private hours log. See docs/phase-3-evidence.md.

-- One period on one date, held or not, recorded by the teacher who taught it (or was to). The period's time, class, subject
-- and teacher are copied in, so the record survives the period being changed or removed: deleting the period only clears
-- slot_id. A reason is required exactly when the lesson was not held.
CREATE TYPE lesson_status AS ENUM ('held', 'not_held');
CREATE TYPE lesson_not_held_reason AS ENUM ('official_duty', 'leave', 'school_programme', 'pupils_away', 'examination', 'other');

CREATE TABLE lesson_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  slot_id uuid,
  on_date date NOT NULL,
  scheduled_teacher_id uuid NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  class_name text,
  subject_name text,
  label text,
  recorded_by uuid NOT NULL,
  status lesson_status NOT NULL,
  reason lesson_not_held_reason,
  note text,
  erph_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_records_reason_when_not_held CHECK ((status = 'not_held') = (reason IS NOT NULL)),
  CONSTRAINT lesson_records_note_length CHECK (note IS NULL OR char_length(note) BETWEEN 1 AND 200),
  CONSTRAINT lesson_records_erph_url CHECK (erph_url IS NULL OR (char_length(erph_url) <= 500 AND erph_url LIKE 'https://%')),
  CONSTRAINT lesson_records_times CHECK (start_time < end_time),
  CONSTRAINT lesson_records_one_per_period UNIQUE (slot_id, on_date),
  FOREIGN KEY (school_id, slot_id) REFERENCES timetable_slots (school_id, id) ON DELETE SET NULL (slot_id),
  FOREIGN KEY (school_id, scheduled_teacher_id) REFERENCES users (school_id, id),
  FOREIGN KEY (school_id, recorded_by) REFERENCES users (school_id, id)
);
CREATE INDEX lesson_records_school_date ON lesson_records (school_id, on_date);

-- A teacher's own record of hours worked outside school hours. Readable only by its owner: every query in the app filters
-- on the owner taken from the session (features/hours/server/hours.repository.ts is the only code that touches it).
CREATE TYPE private_hours_kind AS ENUM ('marking', 'preparation', 'administration', 'meetings', 'other');

CREATE TABLE private_hours_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  on_date date NOT NULL,
  minutes integer NOT NULL,
  kind private_hours_kind NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT private_hours_log_minutes CHECK (minutes BETWEEN 1 AND 1440),
  CONSTRAINT private_hours_log_note_length CHECK (note IS NULL OR char_length(note) BETWEEN 1 AND 200),
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);
CREATE INDEX private_hours_log_owner ON private_hours_log (school_id, user_id, on_date);

-- A monthly total the owner chose to share: the figure at the moment of sharing, never the entries behind it.
CREATE TABLE private_hours_shares (
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  month date NOT NULL,
  minutes integer NOT NULL,
  shared_at timestamptz NOT NULL,
  PRIMARY KEY (school_id, user_id, month),
  CONSTRAINT private_hours_shares_first_of_month CHECK (extract(day FROM month) = 1),
  CONSTRAINT private_hours_shares_minutes CHECK (minutes >= 0),
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) ON DELETE CASCADE
);

-- Down Migration
DROP TABLE private_hours_shares;
DROP TABLE private_hours_log;
DROP TYPE private_hours_kind;
DROP TABLE lesson_records;
DROP TYPE lesson_not_held_reason;
DROP TYPE lesson_status;
