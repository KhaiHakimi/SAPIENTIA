-- Up Migration
-- Removing a timetable period used to delete every relief arranged for it, past ones included, so last month's report
-- changed and nobody was told. The app now refuses to remove a period while it has relief still to come; relief already
-- over is kept as history, the way lesson records are: the relief keeps its copied date, times and teachers, and removing
-- the period only clears slot_id.
ALTER TABLE relief_assignments
  ALTER COLUMN slot_id DROP NOT NULL,
  DROP CONSTRAINT relief_assignments_school_id_slot_id_fkey,
  ADD CONSTRAINT relief_assignments_school_id_slot_id_fkey
    FOREIGN KEY (school_id, slot_id) REFERENCES timetable_slots (school_id, id) ON DELETE SET NULL (slot_id);

-- Down Migration
-- Relief whose period has gone cannot point at a period again, so it is dropped, as the old cascade would have done.
DELETE FROM relief_assignments WHERE slot_id IS NULL;
ALTER TABLE relief_assignments
  DROP CONSTRAINT relief_assignments_school_id_slot_id_fkey,
  ADD CONSTRAINT relief_assignments_school_id_slot_id_fkey
    FOREIGN KEY (school_id, slot_id) REFERENCES timetable_slots (school_id, id) ON DELETE CASCADE,
  ALTER COLUMN slot_id SET NOT NULL;
