'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  Users, 
  Trophy, 
  Loader2, 
  Clock, 
  BarChart3, 
  Flame, 
  ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TeamScoreRow {
  team_id: 'V' | 'T';
  team_display_name: string;
  total_players: number;
  total_points: number;
  avg_points_per_player: number;
  rank: number;
}

export default function AdminDashboardPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [quizState, setQuizState] = useState<any>(null);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [fetchingQuestions, setFetchingQuestions] = useState(true);
  const [timerDuration, setTimerDuration] = useState<number>(10);
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamScoreRow[]>([]);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    fetchQuestions();
    fetchQuizState();
    fetchParticipantCount();
    fetchTeamScores();

    // Listen to changes on participants and answers to re-fetch view rankings
    const pChannel = supabase
      .channel('admin_dash_participants_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        fetchParticipantCount();
        fetchTeamScores();
      })
      .subscribe();

    const aChannel = supabase
      .channel('admin_dash_answers_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => {
        fetchTeamScores();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pChannel);
      supabase.removeChannel(aChannel);
    };
  }, []);

  const fetchQuestions = async () => {
    setFetchingQuestions(true);
    const { data } = await supabase
      .from('questions')
      .select('*')
      .order('question_number', { ascending: true });

    if (data) setQuestions(data);
    setFetchingQuestions(false);
  };

  const fetchQuizState = async () => {
    const { data } = await supabase.from('quiz_state').select('*');
    if (data && data.length > 0) {
      setQuizState(data[0]);
      if (data[0].timer_duration) {
        setTimerDuration(Number(data[0].timer_duration));
      }
    }
  };

  const fetchParticipantCount = async () => {
    const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true });
    setParticipantsCount(count || 0);
  };

  // Queries the SQL View directly
  const fetchTeamScores = async () => {
    const { data, error } = await supabase
      .from('team_scores')
      .select('*')
      .order('rank', { ascending: true });

    if (!error && data) {
      setTeamLeaderboard(data as TeamScoreRow[]);
    }
  };

  const broadcastQuestion = async (q: any, index: number) => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    const targetIdx = q.question_number ? Number(q.question_number) : index + 1;
    const rowId = quizState?.id || '1786577f-3af7-4f70-872f-164d6e8a6b2f';

    const { data, error } = await supabase
      .from('quiz_state')
      .update({ 
        is_live: true, 
        active_question_index: targetIdx, 
        question_start_time: nowIso,
        timer_duration: timerDuration,
        updated_at: nowIso
      })
      .eq('id', rowId)
      .select();

    if (error) {
      console.error('Broadcast error:', error);
      alert('Broadcast error: ' + error.message);
    } else if (data && data.length > 0) {
      setQuizState(data[0]);
    }
    setLoading(false);
  };

  const setWaitingState = async () => {
    setLoading(true);
    const rowId = quizState?.id || '1786577f-3af7-4f70-872f-164d6e8a6b2f';

    const { data, error } = await supabase
      .from('quiz_state')
      .update({ 
        is_live: false, 
        active_question_index: 0, 
        question_start_time: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', rowId)
      .select();

    if (!error && data && data.length > 0) setQuizState(data[0]);
    setLoading(false);
  };

  const endQuiz = async () => {
    setLoading(true);
    const rowId = quizState?.id || '1786577f-3af7-4f70-872f-164d6e8a6b2f';

    const { data, error } = await supabase
      .from('quiz_state')
      .update({ 
        is_live: false, 
        active_question_index: -1, 
        question_start_time: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', rowId)
      .select();

    if (!error && data && data.length > 0) setQuizState(data[0]);
    setLoading(false);
  };

  const timerOptions = [5, 10, 15, 30, 45, 60];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#131b2e] border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Quiz Host Control Panel</h1>
          <p className="text-xs sm:text-sm text-slate-400">Battle: Team V (Vibe) vs Team T (Tribe)</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 rounded-xl text-indigo-400 font-semibold text-xs sm:text-sm">
            <Users className="w-4 h-4" />
            <span>{participantsCount} Joined</span>
          </div>

          <Button
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className={
              showStats
                ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs'
            }
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            {showStats ? 'Hide Live Stats' : 'Show Live Stats'}
          </Button>

          <Link href="/leaderboard" target="_blank">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* LIVE VIBE VS TRIBE BATTLE STANDINGS */}
      {showStats && (
        <div className="bg-[#131b2e] border border-amber-500/30 p-5 rounded-2xl space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Trophy className="w-4 h-4" />
              <span>Live Team Battle Standings (Sorted by Avg Score)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTeamScores}
              className="text-xs text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamLeaderboard.length === 0 ? (
              <div className="col-span-2 text-center text-xs text-slate-500 py-4">
                No participants joined yet.
              </div>
            ) : (
              teamLeaderboard.map((team, idx) => (
                <div
                  key={team.team_id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 relative overflow-hidden ${
                    team.team_id === 'V'
                      ? 'bg-purple-950/30 border-purple-500/40 text-purple-300'
                      : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {idx === 0 && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-black text-[10px] font-black uppercase px-3 py-0.5 rounded-bl-lg flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-black" /> Current Leader
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900/80 border border-white/10 text-white font-extrabold text-base flex items-center justify-center">
                        #{team.rank || idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white">{team.team_display_name}</h3>
                        <span className="text-xs text-slate-400">
                          {team.total_players} {team.total_players === 1 ? 'player' : 'players'} enrolled
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-white">
                        {team.avg_points_per_player || 0} <span className="text-xs text-slate-400 font-normal">avg</span>
                      </div>
                      <div className="text-xs text-indigo-300 font-mono font-medium">
                        {team.total_points || 0} {team.total_points === 1 ? 'total pt' : 'total pts'}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        team.team_id === 'V' ? 'bg-purple-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((team.avg_points_per_player || 0) * 20, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#131b2e] border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <Clock className="w-4 h-4" />
            <span>Question Timer Duration</span>
          </div>
          <p className="text-xs text-slate-400">Selected countdown window per question:</p>
          <div className="flex flex-wrap gap-2">
            {timerOptions.map((sec) => (
              <Button
                key={sec}
                size="sm"
                onClick={() => setTimerDuration(sec)}
                variant={timerDuration === sec ? 'default' : 'outline'}
                className={
                  timerDuration === sec
                    ? 'bg-indigo-600 text-white font-bold px-3 py-1'
                    : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 px-3 py-1'
                }
              >
                {sec}s
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-[#131b2e] border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Room Actions</span>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={setWaitingState}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Waiting Room
            </Button>
            <Button
              onClick={endQuiz}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 text-xs"
            >
              <Trophy className="w-3.5 h-3.5 mr-1.5 text-yellow-400" />
              End Quiz
            </Button>
          </div>
        </div>
      </div>

      {/* Questions Bank List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Questions Bank ({questions.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchQuestions}
            className="text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {fetchingQuestions ? (
          <div className="p-8 text-center bg-[#131b2e] border border-slate-800 rounded-xl text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> Loading questions...
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center bg-[#131b2e] border border-slate-800 rounded-xl text-slate-400">
            <p className="font-semibold text-slate-200">No questions found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {questions.map((q, index) => {
              const qNum = q.question_number ? Number(q.question_number) : index + 1;
              const isCurrent = quizState?.is_live && Number(quizState?.active_question_index) === qNum;

              return (
                <div
                  key={q.id || index}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
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
                    <h3 className="text-sm sm:text-base font-medium text-slate-100">{q.question_text}</h3>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => broadcastQuestion(q, index)}
                    disabled={loading}
                    className={
                      isCurrent
                        ? 'bg-green-600 hover:bg-green-500 text-white text-xs whitespace-nowrap'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white text-xs whitespace-nowrap'
                    }
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    {isCurrent ? 'Re-broadcast' : `Broadcast (${timerDuration}s)`}
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