-- Up Migration
-- Phase 3, Sprint 9: lesson records and the private hours log. See docs/phase-3-evidence.md.
-- Sprint 10 (folded in before release): uploaded files, a photo on a lesson record, and the shared material bank.

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

-- An uploaded file. The bytes are on disk outside the web root under storage_key, a random name that says nothing about the
-- file; the name the uploader gave is kept only to offer it back on download. Files are served only by the app, after an
-- authorisation check that depends on the purpose (features/files/server/files.service.ts).
CREATE TYPE stored_file_purpose AS ENUM ('lesson_photo', 'material');

CREATE TABLE stored_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  uploaded_by uuid NOT NULL,
  purpose stored_file_purpose NOT NULL,
  storage_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  file_name text NOT NULL,
  sha256 bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stored_files_key CHECK (storage_key ~ '^[0-9a-f]{64}$'),
  CONSTRAINT stored_files_size CHECK (byte_size BETWEEN 1 AND 20971520),
  CONSTRAINT stored_files_name_length CHECK (char_length(file_name) BETWEEN 1 AND 120),
  CONSTRAINT stored_files_school_id_id_unique UNIQUE (school_id, id),
  FOREIGN KEY (school_id, uploaded_by) REFERENCES users (school_id, id)
);

-- One optional photo per lesson record (the board, the pupils' work), seen by the same people as the record itself.
ALTER TABLE lesson_records
  ADD COLUMN photo_file_id uuid UNIQUE,
  ADD CONSTRAINT lesson_records_photo_fk FOREIGN KEY (school_id, photo_file_id) REFERENCES stored_files (school_id, id)
    ON DELETE SET NULL (photo_file_id);

-- The shared material bank: a link (to DELIMa or elsewhere, preferred over copying) or one uploaded file, tagged by subject,
-- year or form, and topic. Removing a subject keeps its materials and drops the tag.
CREATE TYPE material_level AS ENUM (
  'tahun_1', 'tahun_2', 'tahun_3', 'tahun_4', 'tahun_5', 'tahun_6',
  'tingkatan_1', 'tingkatan_2', 'tingkatan_3', 'tingkatan_4', 'tingkatan_5', 'tingkatan_6'
);

CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  subject_id uuid,
  level material_level,
  topic text,
  url text,
  file_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT materials_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT materials_description_length CHECK (description IS NULL OR char_length(description) BETWEEN 1 AND 500),
  CONSTRAINT materials_topic_length CHECK (topic IS NULL OR char_length(topic) BETWEEN 1 AND 80),
  CONSTRAINT materials_url CHECK (url IS NULL OR (char_length(url) <= 500 AND url LIKE 'https://%')),
  CONSTRAINT materials_link_or_file CHECK ((url IS NULL) <> (file_id IS NULL)),
  FOREIGN KEY (school_id, created_by) REFERENCES users (school_id, id),
  FOREIGN KEY (school_id, subject_id) REFERENCES subjects (school_id, id) ON DELETE SET NULL (subject_id),
  FOREIGN KEY (school_id, file_id) REFERENCES stored_files (school_id, id)
);
CREATE INDEX materials_school_newest ON materials (school_id, created_at DESC, id DESC);

-- Down Migration
DROP TABLE materials;
DROP TYPE material_level;
ALTER TABLE lesson_records DROP CONSTRAINT lesson_records_photo_fk, DROP COLUMN photo_file_id;
DROP TABLE stored_files;
DROP TYPE stored_file_purpose;
DROP TABLE private_hours_shares;
DROP TABLE private_hours_log;
DROP TYPE private_hours_kind;
DROP TABLE lesson_records;
DROP TYPE lesson_not_held_reason;
DROP TYPE lesson_status;
