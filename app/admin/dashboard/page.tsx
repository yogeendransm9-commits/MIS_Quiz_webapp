'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, RefreshCw, CheckCircle2, Users, Trophy, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [quizState, setQuizState] = useState<any>(null);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [fetchingQuestions, setFetchingQuestions] = useState(true);
  const [timerDuration, setTimerDuration] = useState<number>(10); // Default 10 seconds

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
    setFetchingQuestions(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('question_number', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
    } else if (data) {
      setQuestions(data);
    }
    setFetchingQuestions(false);
  };

  const fetchQuizState = async () => {
    const { data, error } = await supabase.from('quiz_state').select('*');
    if (error) {
      console.error('Error fetching quiz state:', error);
    } else if (data && data.length > 0) {
      setQuizState(data[0]);
    }
  };

  const fetchParticipantCount = async () => {
    const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true });
    setParticipantsCount(count || 0);
  };

  const broadcastQuestion = async (q: any, index: number) => {
    setLoading(true);
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + timerDuration * 1000);
    const targetIdx = q.question_number ? Number(q.question_number) : index + 1;
    const rowId = quizState?.id || '1786577f-3af7-4f70-872f-164d6e8a6b2f';

    const { data, error } = await supabase
      .from('quiz_state')
      .upsert({ 
        id: rowId, 
        is_live: true, 
        active_question_index: targetIdx, 
        question_start_time: startTime.toISOString(),
        updated_at: startTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Broadcast error:', error);
    } else if (data) {
      setQuizState(data);
    }
    setLoading(false);
  };

  const setWaitingState = async () => {
    setLoading(true);
    const rowId = quizState?.id || '1786577f-3af7-4f70-872f-164d6e8a6b2f';

    const { data, error } = await supabase
      .from('quiz_state')
      .upsert({ 
        id: rowId, 
        is_live: false, 
        active_question_index: 0, 
        question_start_time: null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (!error) setQuizState(data);
    setLoading(false);
  };

  const endQuiz = async () => {
    setLoading(true);
    const rowId = quizState?.id || '1786577f-3af7-4f70-872f-164d6e8a6b2f';

    const { data, error } = await supabase
      .from('quiz_state')
      .upsert({ 
        id: rowId, 
        is_live: false, 
        active_question_index: -1, 
        question_start_time: null,
        updated_at: new Date().toISOString()
      })
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timer Duration Picker */}
        <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <Clock className="w-4 h-4" />
            <span>Question Timer Duration</span>
          </div>
          <p className="text-xs text-slate-400">Questions will automatically disappear after this time:</p>
          <div className="flex gap-2">
            {[5, 10, 15, 30].map((sec) => (
              <Button
                key={sec}
                onClick={() => setTimerDuration(sec)}
                variant={timerDuration === sec ? 'default' : 'outline'}
                className={
                  timerDuration === sec
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700'
                }
              >
                {sec}s
              </Button>
            ))}
          </div>
        </div>

        {/* Live Overrides */}
        <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Room Actions</span>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={setWaitingState}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Reset Room
            </Button>
            <Button
              onClick={endQuiz}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
            >
              <Trophy className="w-3.5 h-3.5 mr-1 text-yellow-400" />
              End Quiz
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Questions Bank ({questions.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchQuestions}
            className="text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh List
          </Button>
        </div>

        {fetchingQuestions ? (
          <div className="p-8 text-center bg-[#131b2e] border border-slate-800 rounded-xl text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> Loading questions...
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center bg-[#131b2e] border border-slate-800 rounded-xl text-slate-400 space-y-2">
            <p className="font-semibold text-slate-200">No questions found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {questions.map((q, index) => {
              const qNum = q.question_number ? Number(q.question_number) : index + 1;
              const isCurrent = quizState?.is_live && Number(quizState?.active_question_index) === qNum;

              return (
                <div
                  key={q.id || index}
                  className={`p-5 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-[#131b2e] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-400 uppercase">
                        Question {qNum}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                          <CheckCircle2 className="w-3 h-3" /> LIVE NOW ({timerDuration}s)
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-100">{q.question_text}</h3>
                  </div>

                  <Button
                    onClick={() => broadcastQuestion(q, index)}
                    disabled={loading}
                    className={
                      isCurrent
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }
                  >
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Broadcast ({timerDuration}s)
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}