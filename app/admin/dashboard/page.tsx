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
  Medal, 
  Flame, 
  ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LeaderboardEntry {
  team_id: string;
  total_score: number;
  correct_count: number;
  participants_count: number;
  members: string[];
}

export default function AdminDashboardPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [quizState, setQuizState] = useState<any>(null);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [fetchingQuestions, setFetchingQuestions] = useState(true);
  const [timerDuration, setTimerDuration] = useState<number>(10);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboardTab, setShowLeaderboardTab] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchQuizState();
    fetchParticipantCount();
    fetchLeaderboardStats();

    // Listen to real-time participant changes
    const participantChannel = supabase
      .channel('admin_participants_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        fetchParticipantCount();
        fetchLeaderboardStats();
      })
      .subscribe();

    // Listen to real-time answer submissions
    const answersChannel = supabase
      .channel('admin_answers_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => {
        fetchLeaderboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(answersChannel);
    };
  }, []);

  const fetchQuestions = async () => {
    setFetchingQuestions(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('question_number', { ascending: true });

    if (!error && data) setQuestions(data);
    setFetchingQuestions(false);
  };

  const fetchQuizState = async () => {
    const { data, error } = await supabase.from('quiz_state').select('*');
    if (!error && data && data.length > 0) {
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

  // Calculates live standings grouped by Team ID
  const fetchLeaderboardStats = async () => {
    const { data: participants } = await supabase.from('participants').select('id, name, team_id');
    const { data: answers } = await supabase.from('answers').select('participant_id, is_correct');

    if (!participants) return;

    const teamMap: Record<string, LeaderboardEntry> = {};

    participants.forEach((p) => {
      const tid = p.team_id || 'Solo';
      if (!teamMap[tid]) {
        teamMap[tid] = {
          team_id: tid,
          total_score: 0,
          correct_count: 0,
          participants_count: 0,
          members: [],
        };
      }
      teamMap[tid].participants_count += 1;
      teamMap[tid].members.push(p.name);
    });

    if (answers) {
      const participantToTeam: Record<string, string> = {};
      participants.forEach((p) => {
        participantToTeam[p.id] = p.team_id || 'Solo';
      });

      answers.forEach((ans) => {
        if (ans.is_correct && participantToTeam[ans.participant_id]) {
          const tid = participantToTeam[ans.participant_id];
          if (teamMap[tid]) {
            teamMap[tid].correct_count += 1;
            teamMap[tid].total_score += 10; // 10 points per correct answer
          }
        }
      });
    }

    const sorted = Object.values(teamMap).sort((a, b) => b.total_score - a.total_score);
    setLeaderboard(sorted);
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
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#131b2e] border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Quiz Host Control Panel</h1>
          <p className="text-xs sm:text-sm text-slate-400">Broadcast questions live and track real-time scores</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 rounded-xl text-indigo-400 font-semibold text-xs sm:text-sm">
            <Users className="w-4 h-4" />
            <span>{participantsCount} Joined</span>
          </div>

          <Button
            size="sm"
            onClick={() => setShowLeaderboardTab(!showLeaderboardTab)}
            className={
              showLeaderboardTab
                ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs'
            }
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            {showLeaderboardTab ? 'Hide Live Stats' : 'Show Live Stats'}
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

      {/* LIVE LEADERBOARD / STATS ACCORDION */}
      {showLeaderboardTab && (
        <div className="bg-[#131b2e] border border-amber-500/30 p-5 rounded-2xl space-y-4 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Trophy className="w-4 h-4" />
              <span>Live Team Standings</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLeaderboardStats}
              className="text-xs text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Scores
            </Button>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No submissions recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {leaderboard.map((team, idx) => (
                <div
                  key={team.team_id}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : idx === 1
                      ? 'bg-slate-300/10 border-slate-400/30 text-white'
                      : idx === 2
                      ? 'bg-amber-700/10 border-amber-700/30 text-white'
                      : 'bg-[#0b0f19] border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-black'
                          : idx === 1
                          ? 'bg-slate-300 text-black'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Team {team.team_id}</span>
                        {idx === 0 && <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {team.correct_count} correct • {team.participants_count} {team.participants_count === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold text-indigo-400 font-mono">{team.total_score}</span>
                    <span className="text-[10px] text-slate-500 block">pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Control Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timer Duration Picker */}
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

        {/* Room Actions */}
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