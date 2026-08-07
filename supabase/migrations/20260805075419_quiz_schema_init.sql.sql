/*
# Quiz Application Schema (Office Event, ~250 participants)

## Overview
A Kahoot-style quiz app for a single office event. No per-user sign-in:
participants register once and the browser keeps a local participant id. Admin
dashboard is password-protected (password stored as edge-function secret).
All tables are shared/public for this one event, so RLS allows anon+authenticated
CRUD. Server-side answer validation + single-answer enforcement is handled by a
SECURITY DEFINER RPC (`submit_answer`).

## New Tables
1. participants - name, team(1..10), roll_number, UNIQUE(team,roll_number)
2. questions - position, question, option_a..e, correct_answer(A..E), UNIQUE(position)
3. answers - participant_id, question_id, selected, is_correct, UNIQUE(participant_id,question_id)
4. quiz_state - singleton(id=1), phase, current_question_id, timer window
5. team_scores - team PK, score
6. individual_scores - participant_id PK, score

## Security
- RLS enabled on every table; anon+authenticated CRUD (single-tenant event).
- submit_answer SECURITY DEFINER: validates playing phase, active question,
  timer not expired, not already answered, valid option; atomic insert + score update.
- reset_quiz SECURITY DEFINER: clears answers, scores, resets state.
- Realtime publication includes all tables.
*/

-- ========== participants ==========
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team int NOT NULL CHECK (team BETWEEN 1 AND 10),
  roll_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team, roll_number)
);
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_participants" ON participants;
CREATE POLICY "anon_select_participants" ON participants FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_participants" ON participants;
CREATE POLICY "anon_insert_participants" ON participants FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_participants" ON participants;
CREATE POLICY "anon_update_participants" ON participants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_participants" ON participants;
CREATE POLICY "anon_delete_participants" ON participants FOR DELETE TO anon, authenticated USING (true);

-- ========== questions ==========
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position int NOT NULL,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  option_e text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A','B','C','D','E')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (position)
);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_questions" ON questions;
CREATE POLICY "anon_select_questions" ON questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_questions" ON questions;
CREATE POLICY "anon_insert_questions" ON questions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_questions" ON questions;
CREATE POLICY "anon_update_questions" ON questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_questions" ON questions;
CREATE POLICY "anon_delete_questions" ON questions FOR DELETE TO anon, authenticated USING (true);

-- ========== answers ==========
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected text NOT NULL CHECK (selected IN ('A','B','C','D','E')),
  is_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, question_id)
);
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_answers" ON answers;
CREATE POLICY "anon_select_answers" ON answers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_answers" ON answers;
CREATE POLICY "anon_insert_answers" ON answers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_answers" ON answers;
CREATE POLICY "anon_update_answers" ON answers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_answers" ON answers;
CREATE POLICY "anon_delete_answers" ON answers FOR DELETE TO anon, authenticated USING (true);

-- ========== quiz_state (singleton) ==========
CREATE TABLE IF NOT EXISTS quiz_state (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  phase text NOT NULL DEFAULT 'idle' CHECK (phase IN ('idle','registration','waiting','playing','paused','ended')),
  current_question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  question_started_at timestamptz,
  question_ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_quiz_state" ON quiz_state;
CREATE POLICY "anon_select_quiz_state" ON quiz_state FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_update_quiz_state" ON quiz_state;
CREATE POLICY "anon_update_quiz_state" ON quiz_state FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_insert_quiz_state" ON quiz_state;
CREATE POLICY "anon_insert_quiz_state" ON quiz_state FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_quiz_state" ON quiz_state;
CREATE POLICY "anon_delete_quiz_state" ON quiz_state FOR DELETE TO anon, authenticated USING (true);

INSERT INTO quiz_state (id, phase) VALUES (1, 'idle') ON CONFLICT (id) DO NOTHING;

-- ========== team_scores ==========
CREATE TABLE IF NOT EXISTS team_scores (
  team int PRIMARY KEY CHECK (team BETWEEN 1 AND 10),
  score int NOT NULL DEFAULT 0
);
ALTER TABLE team_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_team_scores" ON team_scores;
CREATE POLICY "anon_select_team_scores" ON team_scores FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_team_scores" ON team_scores;
CREATE POLICY "anon_insert_team_scores" ON team_scores FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_team_scores" ON team_scores;
CREATE POLICY "anon_update_team_scores" ON team_scores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_team_scores" ON team_scores;
CREATE POLICY "anon_delete_team_scores" ON team_scores FOR DELETE TO anon, authenticated USING (true);

INSERT INTO team_scores (team, score) SELECT t, 0 FROM generate_series(1,10) AS t ON CONFLICT (team) DO NOTHING;

-- ========== individual_scores ==========
CREATE TABLE IF NOT EXISTS individual_scores (
  participant_id uuid PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0
);
ALTER TABLE individual_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_individual_scores" ON individual_scores;
CREATE POLICY "anon_select_individual_scores" ON individual_scores FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_individual_scores" ON individual_scores;
CREATE POLICY "anon_insert_individual_scores" ON individual_scores FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_individual_scores" ON individual_scores;
CREATE POLICY "anon_update_individual_scores" ON individual_scores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_individual_scores" ON individual_scores;
CREATE POLICY "anon_delete_individual_scores" ON individual_scores FOR DELETE TO anon, authenticated USING (true);

-- ========== submit_answer RPC ==========
CREATE OR REPLACE FUNCTION submit_answer(p_participant uuid, p_question uuid, p_selected text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state record;
  v_correct text;
  v_is_correct boolean;
  v_team int;
BEGIN
  IF p_selected NOT IN ('A','B','C','D','E') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid option');
  END IF;

  SELECT phase, current_question_id, question_ends_at INTO v_state
  FROM quiz_state WHERE id = 1 FOR UPDATE;

  IF v_state.phase IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Quiz not initialized');
  END IF;
  IF v_state.phase <> 'playing' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Quiz is not active');
  END IF;
  IF v_state.current_question_id IS NULL OR v_state.current_question_id <> p_question THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Question not active');
  END IF;
  IF v_state.question_ends_at IS NOT NULL AND now() > v_state.question_ends_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Time up');
  END IF;
  IF EXISTS (SELECT 1 FROM answers WHERE participant_id = p_participant AND question_id = p_question) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already answered');
  END IF;

  SELECT correct_answer INTO v_correct FROM questions WHERE id = p_question;
  IF v_correct IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Question not found');
  END IF;

  SELECT team INTO v_team FROM participants WHERE id = p_participant;
  IF v_team IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Participant not found');
  END IF;

  v_is_correct := (p_selected = v_correct);

  BEGIN
    INSERT INTO answers (participant_id, question_id, selected, is_correct)
    VALUES (p_participant, p_question, p_selected, v_is_correct);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already answered');
  END;

  IF v_is_correct THEN
    INSERT INTO individual_scores (participant_id, score) VALUES (p_participant, 1)
      ON CONFLICT (participant_id) DO UPDATE SET score = individual_scores.score + 1;
    INSERT INTO team_scores (team, score) VALUES (v_team, 1)
      ON CONFLICT (team) DO UPDATE SET score = team_scores.score + 1;
  END IF;

  RETURN jsonb_build_object('ok', true, 'correct', v_is_correct, 'correct_answer', v_correct);
END;
$$;
GRANT EXECUTE ON FUNCTION submit_answer(uuid, uuid, text) TO anon, authenticated;

-- ========== reset_quiz RPC ==========
CREATE OR REPLACE FUNCTION reset_quiz()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM answers;
  DELETE FROM individual_scores;
  UPDATE team_scores SET score = 0;
  UPDATE quiz_state SET phase = 'idle', current_question_id = NULL,
    question_started_at = NULL, question_ends_at = NULL, updated_at = now()
  WHERE id = 1;
END;
$$;
GRANT EXECUTE ON FUNCTION reset_quiz() TO anon, authenticated;

-- ========== Realtime publication ==========
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['participants','questions','answers','quiz_state','team_scores','individual_scores'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I;', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ========== indexes ==========
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant ON answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team);
CREATE INDEX IF NOT EXISTS idx_questions_position ON questions(position);
