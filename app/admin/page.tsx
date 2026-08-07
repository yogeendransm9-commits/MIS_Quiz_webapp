'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, RefreshCw, CheckCircle2, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [quizState, setQuizState] = useState<any>(null);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchQuizState();
    fetchParticipantCount();

    const channel = supabase
      .channel('admin_dashboard_participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants' },
        () => fetchParticipantCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: true });
    if (data) setQuestions(data);
  };

  const fetchQuizState = async () => {
    const { data } = await supabase.from('quiz_state').select('*').single();
    if (data) setQuizState(data);
  };

  const fetchParticipantCount = async () => {
    const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true });
    setParticipantsCount(count || 0);
  };

  const broadcastQuestion = async (questionId: number) => {
    setLoading(true);
    const endTime = new Date(Date.now() + 30 * 1000).toISOString();

    const { data, error } = await supabase
      .from('quiz_state')
      .upsert({ id: 1, status: 'active', current_question_id: questionId, end_time: endTime })
      .select()
      .single();

    if (!error) setQuizState(data);
    setLoading(false);
  };

  const setWaitingState = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_state')
      .upsert({ id: 1, status: 'waiting', current_question_id: null, end_time: null })
      .select()
      .single();

    if (!error) setQuizState(data);
    setLoading(false);
  };

  const endQuiz = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_state')
      .upsert({ id: 1, status: 'completed', current_question_id: null, end_time: null })
      .select()
      .single();

    if (!error) setQuizState(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6 sm:p-10 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#131b2e] border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quiz Host Control Panel</h1>
          <p className="text-sm text-slate-400">Broadcast questions live to connected devices</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-indigo-400 font-semibold text-sm">
            <Users className="w-4 h-4" />
            <span>{participantsCount} Participants Joined</span>
          </div>
        </div>
      </div>

      <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Live Status Override</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={setWaitingState}
            disabled={loading}
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2 text-slate-400" />
            Set Waiting Room Screen
          </Button>
          <Button
            onClick={endQuiz}
            disabled={loading}
            variant="outline"
            className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
          >
            <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
            End Quiz & Show Leaderboard
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Questions Bank</h2>
        <div className="grid grid-cols-1 gap-4">
          {questions.map((q, index) => {
            const isCurrent = quizState?.current_question_id === q.id && quizState?.status === 'active';
            return (
              <div
                key={q.id}
                className={`p-5 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                  isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                    : 'bg-[#131b2e] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase">Question {index + 1}</span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                        <CheckCircle2 className="w-3 h-3" /> LIVE NOW
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">{q.question_text}</h3>
                </div>

                <Button
                  onClick={() => broadcastQuestion(q.id)}
                  disabled={loading}
                  className={isCurrent ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  {isCurrent ? 'Re-push Question' : 'Broadcast Live'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}