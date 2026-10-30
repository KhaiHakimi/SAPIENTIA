-- Up Migration
-- One row per school. Every school-owned table will carry school_id, so cross-school refusal (G2) has something to check.
-- Times are stored in UTC; time_zone is the school's IANA zone, used to work out its working hours for held delivery.
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  time_zone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schools_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT schools_name_not_blank CHECK (btrim(name) <> '')
);

-- Codes are matched without regard to case, so 'abc1234' and 'ABC1234' cannot both exist.
CREATE UNIQUE INDEX schools_code_unique ON schools (lower(code));

-- Down Migration
DROP TABLE schools;
