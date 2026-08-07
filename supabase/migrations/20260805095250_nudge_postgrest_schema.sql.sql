/*
# Nudge PostgREST schema cache via add+drop dummy column

Adding then dropping a column changes the table definition in pg_catalog in a
way PostgREST cannot ignore, forcing it to re-introspect the table on the next
NOTIFY. The net schema change is zero (column is added then removed).
*/

ALTER TABLE participants ADD COLUMN IF NOT EXISTS _pgrst_nudge int DEFAULT 0;
ALTER TABLE participants DROP COLUMN IF EXISTS _pgrst_nudge;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS _pgrst_nudge int DEFAULT 0;
ALTER TABLE questions DROP COLUMN IF EXISTS _pgrst_nudge;

ALTER TABLE answers ADD COLUMN IF NOT EXISTS _pgrst_nudge int DEFAULT 0;
ALTER TABLE answers DROP COLUMN IF EXISTS _pgrst_nudge;

ALTER TABLE quiz_state ADD COLUMN IF NOT EXISTS _pgrst_nudge int DEFAULT 0;
ALTER TABLE quiz_state DROP COLUMN IF EXISTS _pgrst_nudge;

ALTER TABLE team_scores ADD COLUMN IF NOT EXISTS _pgrst_nudge int DEFAULT 0;
ALTER TABLE team_scores DROP COLUMN IF EXISTS _pgrst_nudge;

ALTER TABLE individual_scores ADD COLUMN IF NOT EXISTS _pgrst_nudge int DEFAULT 0;
ALTER TABLE individual_scores DROP COLUMN IF EXISTS _pgrst_nudge;

NOTIFY pgrst, 'reload schema';
