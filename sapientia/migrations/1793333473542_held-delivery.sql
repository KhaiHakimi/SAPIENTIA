-- Up Migration
-- Sprint 4: each school's working hours and weekend, and its calendar of holidays and replacement working days.

-- One row per school, created the first time an administrator saves the settings; until then the defaults in
-- features/delivery/constants apply. Weekend days use ISO numbers: 1 Monday ... 7 Sunday.
CREATE TABLE school_settings (
  school_id uuid PRIMARY KEY REFERENCES schools (id),
  work_start time NOT NULL,
  work_end time NOT NULL,
  weekend_days smallint[] NOT NULL,
  -- Only used to suggest a weekend in the settings screen; the weekend itself is always what the school saved.
  state_code text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT school_settings_hours CHECK (work_start < work_end),
  CONSTRAINT school_settings_weekend CHECK (weekend_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[] AND cardinality(weekend_days) <= 3),
  FOREIGN KEY (school_id, updated_by) REFERENCES users (school_id, id)
);

-- holiday: no delivery that day even if it is a weekday (public, state or school holiday).
-- working_day: a weekend day the school works (a replacement day), so delivery happens.
CREATE TYPE calendar_event_kind AS ENUM ('holiday', 'working_day');

CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools (id),
  on_date date NOT NULL,
  kind calendar_event_kind NOT NULL,
  title text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  -- One entry per day: a day is either a holiday or an extra working day, never both.
  CONSTRAINT calendar_events_one_per_day UNIQUE (school_id, on_date),
  FOREIGN KEY (school_id, created_by) REFERENCES users (school_id, id)
);

-- Down Migration
DROP TABLE calendar_events;
DROP TYPE calendar_event_kind;
DROP TABLE school_settings;
