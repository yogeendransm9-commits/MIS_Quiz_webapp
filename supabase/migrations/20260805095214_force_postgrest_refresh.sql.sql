/*
# Force PostgREST schema cache refresh via RLS toggle

PostgREST's schema cache is stale (returns "column ... does not exist" for
columns that exist in pg_catalog). The NOTIFY pgrst reload did not propagate.
Toggling RLS off/on forces PostgREST to re-introspect each table. This is a
no-op data-wise: policies are preserved because we only disable+enable RLS,
we do not drop policies.
*/

ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE quiz_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_state ENABLE ROW LEVEL SECURITY;

ALTER TABLE team_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE individual_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE individual_scores ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
