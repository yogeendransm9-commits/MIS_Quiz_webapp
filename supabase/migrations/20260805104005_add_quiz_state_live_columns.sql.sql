/*
# Add live-control columns to quiz_state

Adds three columns the admin Start Quiz action will set:
- is_live boolean (whether the quiz is live/running)
- active_question_index int (1-based index of the active question)
- question_start_time timestamptz (when the current question started)

Non-destructive: only adds columns, does not drop or rename anything.
*/

ALTER TABLE quiz_state ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;
ALTER TABLE quiz_state ADD COLUMN IF NOT EXISTS active_question_index int NOT NULL DEFAULT 0;
ALTER TABLE quiz_state ADD COLUMN IF NOT EXISTS question_start_time timestamptz;

NOTIFY pgrst, 'reload schema';
