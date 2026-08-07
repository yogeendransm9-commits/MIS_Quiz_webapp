// Verification script: exercises the app's 4 core flows against the live
// Supabase project using ONLY the anon key (the same client the browser uses).
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(URL, ANON);

let pass = 0, fail = 0;
const log = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' :: ' + detail : ''}`);
  ok ? pass++ : fail++;
};

// unique-ish roll number per run so re-runs don't trip the unique constraint
const runTag = String(Date.now()).slice(-5);
const name = `Verify User ${runTag}`;
const team = 3;
const roll = `R${runTag}`;

console.log('--- 1. Registration ---');
const { data: reg, error: regErr } = await supabase
  .from('participants')
  .insert({ name, team, roll_number: roll })
  .select('id, name, team, roll_number')
  .single();
log(!regErr && !!reg?.id, 'insert participant', regErr?.message || `${reg?.name} | Team ${reg?.team} | ${reg?.roll_number}`);
const participantId = reg?.id;

// duplicate prevention
const { error: dupErr } = await supabase
  .from('participants')
  .insert({ name: 'Dup', team, roll_number: roll });
log(!!dupErr && dupErr.code === '23505', 'duplicate team+roll rejected', dupErr?.code || '');

console.log('--- 2. Questions load ---');
const { data: qs, error: qErr } = await supabase
  .from('questions')
  .select('id, position, question, correct_answer')
  .order('position', { ascending: true });
log(!qErr && Array.isArray(qs) && qs.length > 0, `loaded ${qs?.length || 0} questions`, qErr?.message || '');
const firstQ = qs?.[0];

console.log('--- 3. Answers stored ---');
// Set quiz_state to playing with question 1 active and a 60s window so the RPC accepts it.
const endsAt = new Date(Date.now() + 60_000).toISOString();
const { error: stErr } = await supabase
  .from('quiz_state')
  .update({ phase: 'playing', current_question_id: firstQ.id, question_started_at: new Date().toISOString(), question_ends_at: endsAt })
  .eq('id', 1);
log(!stErr, 'set quiz_state to playing', stErr?.message || '');

const { data: ansRes, error: ansErr } = await supabase.rpc('submit_answer', {
  p_participant: participantId, p_question: firstQ.id, p_selected: firstQ.correct_answer,
});
log(!ansErr && ansRes?.ok === true, 'submit_answer accepted', ansErr?.message || JSON.stringify(ansRes));

// verify row written
const { data: ansRow, error: ansRowErr } = await supabase
  .from('answers')
  .select('id, selected, is_correct')
  .eq('participant_id', participantId)
  .eq('question_id', firstQ.id)
  .maybeSingle();
log(!ansRowErr && !!ansRow?.id, 'answer row persisted', ansRowErr?.message || `selected=${ansRow?.selected} correct=${ansRow?.is_correct}`);

// second submit rejected
const { data: ansRes2 } = await supabase.rpc('submit_answer', {
  p_participant: participantId, p_question: firstQ.id, p_selected: 'A',
});
log(ansRes2?.ok === false && ansRes2?.error === 'Already answered', 'second answer rejected as already answered', JSON.stringify(ansRes2));

console.log('--- 4. Leaderboards read ---');
const { data: teams, error: tErr } = await supabase.from('team_scores').select('team, score').order('score', { ascending: false });
log(!tErr && Array.isArray(teams), `team_scores read (${teams?.length} rows)`, tErr?.message || `top: Team ${teams?.[0]?.team} = ${teams?.[0]?.score}`);

const { data: indiv, error: iErr } = await supabase
  .from('individual_scores')
  .select('participant_id, score, participants(name, team, roll_number)')
  .order('score', { ascending: false });
log(!iErr && Array.isArray(indiv), `individual_scores read (${indiv?.length} rows)`, iErr?.message || `top: ${indiv?.[0]?.participants?.name} = ${indiv?.[0]?.score}`);

// cleanup: reset quiz state + remove the test participant (cascades answers+scores)
await supabase.rpc('reset_quiz');
await supabase.from('participants').delete().eq('id', participantId);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
