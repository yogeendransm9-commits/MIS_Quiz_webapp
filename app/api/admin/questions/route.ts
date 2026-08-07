import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { OPTION_KEYS, type OptionKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase.from('questions').select('*').order('position', { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, questions: data });
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();
  const body = await req.json();

  if (body.action === 'reorder') {
    const order: string[] = body.order;
    if (!Array.isArray(order)) return NextResponse.json({ ok: false, error: 'Bad order' }, { status: 400 });
    // assign positions 1..n
    const updates = order.map((id, i) =>
      supabase.from('questions').update({ position: i + 1 }).eq('id', id),
    );
    await Promise.all(updates);
    return NextResponse.json({ ok: true });
  }

  // create / update / delete
  const mode = body.mode as 'create' | 'update' | 'delete';
  if (mode === 'delete') {
    const { id } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    // re-pack positions after delete
    const { data: all } = await supabase.from('questions').select('id, position').order('position', { ascending: true });
    const remaining = ((all as { id: string; position: number }[]) || []).filter((q) => q.id !== id);
    await supabase.from('questions').delete().eq('id', id);
    await Promise.all(remaining.map((q, i) => supabase.from('questions').update({ position: i + 1 }).eq('id', q.id)));
    return NextResponse.json({ ok: true });
  }

  const q = body.question;
  if (!q || !q.question || !q.option_a || !q.option_b || !q.option_c || !q.option_d || !q.option_e) {
    return NextResponse.json({ ok: false, error: 'All fields are required' }, { status: 400 });
  }
  if (!OPTION_KEYS.includes(q.correct_answer as OptionKey)) {
    return NextResponse.json({ ok: false, error: 'Invalid correct answer' }, { status: 400 });
  }

  if (mode === 'create') {
    const { data: maxRow } = await supabase.from('questions').select('position').order('position', { ascending: false }).limit(1).maybeSingle();
    const nextPos = ((maxRow as { position: number } | null)?.position ?? 0) + 1;
    const { error } = await supabase.from('questions').insert({
      position: nextPos,
      question: q.question,
      option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, option_e: q.option_e,
      correct_answer: q.correct_answer,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // update
  const { id, ...fields } = q;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
  const { error } = await supabase.from('questions').update({
    question: fields.question,
    option_a: fields.option_a, option_b: fields.option_b, option_c: fields.option_c, option_d: fields.option_d, option_e: fields.option_e,
    correct_answer: fields.correct_answer,
  }).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
