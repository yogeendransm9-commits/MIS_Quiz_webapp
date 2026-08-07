'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2, Trophy, Loader2 } from 'lucide-react';

export default function PlayPage() {
  const [participant, setParticipant] = useState<any>(null);
  const [quizState, setQuizState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const session = localStorage.getItem('quiz_participant');
    if (!session) {
      router.push('/register');
      return;
    }
    setParticipant(JSON.parse(session));

    // Fetch initial quiz state
    fetchQuizState();

    // Subscribe to live quiz state updates via Supabase Realtime
    const channel = supabase
      .channel('quiz_live_state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_state' },
        (payload) => {
          handleQuizStateUpdate(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQuizState = async () => {
    const { data } = await supabase.from('quiz_state').select('*').single();
    if (data) handleQuizStateUpdate(data);
  };

  const handleQuizStateUpdate = async (state: any) => {
    setQuizState(state);
    if (state.current_question_id) {
      const { data: question } = await supabase
        .from('questions')
        .select('*')
        .eq('id', state.current_question_id)
        .single();

      setCurrentQuestion(question);
      setSelectedOption(null);
      setHasSubmitted(false);
    }
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (!quizState?.end_time || quizState?.status !== 'active') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(quizState.end_time).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [quizState?.end_time, quizState?.status]);

  const submitAnswer = async (optionIndex: number) => {
    if (hasSubmitted || timeLeft === 0) return;
    setSelectedOption(optionIndex);
    setHasSubmitted(true);

    await supabase.from('responses').insert([
      {
        participant_id: participant.id,
        question_id: currentQuestion.id,
        selected_option: optionIndex,
        is_correct: optionIndex === currentQuestion.correct_option,
      },
    ]);
  };

  if (!quizState || quizState.status === 'waiting') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <h2 className="text-xl font-bold">You're in! Waiting for host to start...</h2>
        <p className="text-slate-400 text-sm mt-2">Logged in as {participant?.name}</p>
      </div>
    );
  }

  if (quizState.status === 'completed') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
        <h1 className="text-2xl font-bold">Quiz Completed!</h1>
        <Button onClick={() => router.push('/leaderboard')} className="bg-indigo-600 hover:bg-indigo-500">
          View Leaderboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Header bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm text-slate-400">
          <span>{participant?.name}</span>
          <div className="flex items-center gap-1 text-indigo-400 font-semibold">
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>
        <Progress value={(timeLeft / (quizState.duration || 30)) * 100} className="h-2 bg-slate-800" />
      </div>

      {/* Main Question Body */}
      {currentQuestion && (
        <div className="my-auto space-y-6">
          <h2 className="text-lg sm:text-xl font-semibold leading-snug">{currentQuestion.question_text}</h2>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option: string, idx: number) => {
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  disabled={hasSubmitted || timeLeft === 0}
                  onClick={() => submitAnswer(idx)}
                  className={`w-full text-left p-4 rounded-xl border transition-all text-base font-medium flex items-center justify-between active:scale-[0.98] ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{option}</span>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div className="text-center py-2 text-xs text-slate-500">
        {hasSubmitted ? 'Answer submitted! Waiting for next question...' : 'Select an answer above'}
      </div>
    </div>
  );
}