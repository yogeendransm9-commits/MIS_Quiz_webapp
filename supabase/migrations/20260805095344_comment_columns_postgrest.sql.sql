/*
# Add column comments to trigger PostgREST re-introspection

PostgREST reads pg_description during schema introspection. Adding comments to
every column is a non-destructive catalog change that can force PostgREST to
re-discover columns when NOTIFY-based reloads are ignored. No schema structure
is changed.
*/

COMMENT ON COLUMN participants.id IS 'Participant UUID PK';
COMMENT ON COLUMN participants.name IS 'Full name';
COMMENT ON COLUMN participants.team IS 'Team number 1-10';
COMMENT ON COLUMN participants.roll_number IS 'Roll number unique within team';
COMMENT ON COLUMN participants.created_at IS 'Registration timestamp';

COMMENT ON COLUMN questions.id IS 'Question UUID PK';
COMMENT ON COLUMN questions.position IS 'Display order 1-based';
COMMENT ON COLUMN questions.question IS 'Question text';
COMMENT ON COLUMN questions.option_a IS 'Option A text';
COMMENT ON COLUMN questions.option_b IS 'Option B text';
COMMENT ON COLUMN questions.option_c IS 'Option C text';
COMMENT ON COLUMN questions.option_d IS 'Option D text';
COMMENT ON COLUMN questions.option_e IS 'Option E text';
COMMENT ON COLUMN questions.correct_answer IS 'Correct option A-E';
COMMENT ON COLUMN questions.created_at IS 'Creation timestamp';

COMMENT ON COLUMN answers.id IS 'Answer UUID PK';
COMMENT ON COLUMN answers.participant_id IS 'Participant FK';
COMMENT ON COLUMN answers.question_id IS 'Question FK';
COMMENT ON COLUMN answers.selected IS 'Selected option A-E';
COMMENT ON COLUMN answers.is_correct IS 'Whether selected equals correct';
COMMENT ON COLUMN answers.created_at IS 'Answer timestamp';

COMMENT ON COLUMN quiz_state.id IS 'Singleton row id 1';
COMMENT ON COLUMN quiz_state.phase IS 'idle|registration|waiting|playing|paused|ended';
COMMENT ON COLUMN quiz_state.current_question_id IS 'Active question FK';
COMMENT ON COLUMN quiz_state.question_started_at IS 'When current question started';
COMMENT ON COLUMN quiz_state.question_ends_at IS 'When current question timer expires';
COMMENT ON COLUMN quiz_state.updated_at IS 'Last update timestamp';

COMMENT ON COLUMN team_scores.team IS 'Team number PK 1-10';
COMMENT ON COLUMN team_scores.score IS 'Team total score';

COMMENT ON COLUMN individual_scores.participant_id IS 'Participant PK FK';
COMMENT ON COLUMN individual_scores.score IS 'Individual total score';

NOTIFY pgrst, 'reload schema';
