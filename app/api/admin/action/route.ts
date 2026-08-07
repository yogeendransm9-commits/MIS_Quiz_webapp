import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { QUESTION_DURATION_SECONDS } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Action =
  | 'start_registration' | 'close_registration'
  | 'start_quiz' | 'pause_quiz' | 'resume_quiz'
  | 'next_question' | 'prev_question' | 'end_quiz' | 'reset_quiz';

const QUESTION_MS = QUESTION_DURATION_SECONDS * 1000;

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as Action;
  const supabase = createServerClient();

  const { data: stateRow } = await supabase
    .from('quiz_state')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  const state = stateRow as { phase: string; current_question_id: string | null } | null;

  const { data: questions } = await supabase
    .from('questions')
    .select('id, position')
    .order('position', { ascending: true });
  const qs = (questions as { id: string; position: number }[]) || [];

  const setPhase = (phase: string) =>
    supabase.from('quiz_state').update({ phase, updated_at: new Date().toISOString() }).eq('id', 1);

  const setQuestion = (qid: string | null, playing: boolean) =>
    supabase.from('quiz_state').update({
      current_question_id: qid,
      phase: playing ? 'playing' : 'paused',
      question_started_at: qid ? new Date().toISOString() : null,
      question_ends_at: qid ? new Date(Date.now() + QUESTION_MS).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);

  switch (action) {
    case 'start_registration':
      await setPhase('registration');
      break;
    case 'close_registration':
      await setPhase(state?.phase === 'idle' ? 'idle' : 'waiting');
      break;
    case 'start_quiz': {
      if (qs.length === 0) return NextResponse.json({ ok: false, error: 'No questions added' }, { status: 400 });
      const nowIso = new Date().toISOString();
      await supabase.from('quiz_state').update({
        is_live: true,
        active_question_index: 1,
        question_start_time: nowIso,
        current_question_id: qs[0].id,
        phase: 'playing',
        question_started_at: nowIso,
        question_ends_at: new Date(Date.now() + QUESTION_MS).toISOString(),
        updated_at: nowIso,
      }).eq('id', 1);
      break;
    }
    case 'next_question': {
      if (qs.length === 0) return NextResponse.json({ ok: false, error: 'No questions' }, { status: 400 });
      const idx = state?.current_question_id ? qs.findIndex((q) => q.id === state.current_question_id) : -1;
      const next = qs[idx + 1];
      if (!next) {
        await supabase.from('quiz_state').update({
          phase: 'ended', current_question_id: null,
          question_started_at: null, question_ends_at: null, updated_at: new Date().toISOString(),
        }).eq('id', 1);
        return NextResponse.json({ ok: true, ended: true });
      }
      await setQuestion(next.id, true);
      break;
    }
    case 'prev_question': {
      if (qs.length === 0) return NextResponse.json({ ok: false, error: 'No questions' }, { status: 400 });
      const idx = state?.current_question_id ? qs.findIndex((q) => q.id === state.current_question_id) : 0;
      const prev = qs[Math.max(0, idx - 1)];
      await setQuestion(prev.id, true);
      break;
    }
    case 'pause_quiz': {
      await supabase.from('quiz_state').update({ phase: 'paused', updated_at: new Date().toISOString() }).eq('id', 1);
      break;
    }
    case 'resume_quiz': {
      if (!state?.current_question_id) return NextResponse.json({ ok: false, error: 'No active question' }, { status: 400 });
      await supabase.from('quiz_state').update({
        phase: 'playing', updated_at: new Date().toISOString(),
      }).eq('id', 1);
      break;
    }
    case 'end_quiz':
      await supabase.from('quiz_state').update({
        phase: 'ended', current_question_id: null,
        question_started_at: null, question_ends_at: null, updated_at: new Date().toISOString(),
      }).eq('id', 1);
      break;
    case 'reset_quiz':
      await supabase.rpc('reset_quiz');
      break;
    default:
      return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
