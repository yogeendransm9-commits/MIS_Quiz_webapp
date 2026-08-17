'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, CheckCircle2, XCircle, Clock, Trophy, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlayPage() {
  const [quizState, setQuizState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [submittedOptionIndex, setSubmittedOptionIndex] = useState<number | null>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('quiz_participant');
    if (stored) {
      try {
        setParticipant(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing participant from localStorage:', e);
      }
    }

    fetchQuizState();

    const channel = supabase
      .channel('play_quiz_state_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_state' },
        (payload) => {
          const newState = payload.new as any;
          if (newState) {
            setQuizState(newState);
            if (newState.is_live && newState.active_question_index > 0) {
              fetchQuestion(newState.active_question_index);
            } else {
              setCurrentQuestion(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Dynamic timer calculation matching host's selected duration
  useEffect(() => {
    if (!quizState?.is_live || !quizState?.question_start_time) {
      setTimeLeft(null);
      return;
    }

    // Read host's chosen duration from quizState (defaulting to 10 if missing)
    const duration = Number(quizState.timer_duration) || 10;

    const updateTimer = () => {
      const startTime = new Date(quizState.question_start_time).getTime();
      const now = new Date().getTime();
      const elapsedSec = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsedSec);

      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [quizState]);

  const fetchQuizState = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('quiz_state').select('*');
    
    if (error) {
      console.error('Error fetching quiz state:', error);
    } else if (data && data.length > 0) {
      const state = data[0];
      setQuizState(state);
      if (state.is_live && state.active_question_index > 0) {
        await fetchQuestion(state.active_question_index);
      }
    }
    setLoading(false);
  };

  const fetchQuestion = async (qIndex: number) => {
    if (!qIndex) return;

    let { data } = await supabase
      .from('questions')
      .select('*')
      .eq('question_number', Number(qIndex))
      .maybeSingle();

    if (!data) {
      const res = await supabase
        .from('questions')
        .select('*')
        .eq('id', qIndex)
        .maybeSingle();
      data = res.data;
    }

    if (data) {
      setCurrentQuestion(data);
      setSelectedOptionIndex(null);
      setSubmittedOptionIndex(null);
    }
  };

  const handleOptionSelect = (index: number) => {
    if (submittedOptionIndex !== null || timeLeft === 0) return;
    setSelectedOptionIndex(index);
  };

  const submitAnswer = async () => {
    if (selectedOptionIndex === null || !currentQuestion || timeLeft === 0) return;

    if (!participant || !participant.id) {
      alert('Participant session not found. Please register again!');
      return;
    }

    setSubmitting(true);

    const storedOptionNumber = selectedOptionIndex + 1;
    const dbCorrectAnswer = 
      currentQuestion.correct_option ?? 
      currentQuestion.correct_answer ?? 
      currentQuestion.answer;

    const isCorrect = Number(dbCorrectAnswer) === storedOptionNumber;

    const payload = {
      participant_id: participant.id,
      question_id: currentQuestion.id,
      selected_option: storedOptionNumber,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('answers').insert([payload]);

    if (error) {
      console.error('Error submitting answer:', error);
      alert('Submission failed: ' + error.message);
    } else {
      setSubmittedOptionIndex(selectedOptionIndex);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
        <p className="text-slate-400 text-xs">Connecting to quiz room...</p>
      </div>
    );
  }

  // WAITING ROOM SCREEN
  if (!quizState || !quizState.is_live || !currentQuestion || quizState.active_question_index <= 0) {
    if (quizState?.active_question_index === -1) {
      return (
        <div className="h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
            <Trophy className="w-7 h-7 text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-1">Quiz Finished!</h1>
          <p className="text-slate-400 max-w-xs text-xs">Check the main leaderboard screen for the results.</p>
        </div>
      );
    }

    return (
      <div className="h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 animate-pulse">
          <Clock className="w-7 h-7 text-indigo-400" />
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-1">Waiting for Host</h1>
        <p className="text-slate-400 max-w-xs text-xs">
          You are connected! Get ready, the next question will appear here as soon as the host broadcasts it.
        </p>
      </div>
    );
  }

  const optionList = [
    { label: 'A', text: currentQuestion.option_a },
    { label: 'B', text: currentQuestion.option_b },
    { label: 'C', text: currentQuestion.option_c },
    { label: 'D', text: currentQuestion.option_d },
    { label: 'E', text: currentQuestion.option_e },
  ].filter((opt) => opt.text);

  const isTimeUp = timeLeft === 0;
  const isLockedInEarly = submittedOptionIndex !== null && !isTimeUp;

  const dbCorrectIndex = 
    (Number(currentQuestion.correct_option ?? currentQuestion.correct_answer ?? currentQuestion.answer) || 1) - 1;
  const userGotItRight = submittedOptionIndex !== null && submittedOptionIndex === dbCorrectIndex;

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0b0f19] text-white p-3 sm:p-5 max-w-md mx-auto flex flex-col justify-between overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-xs tracking-tight">Question {currentQuestion.question_number || ''}</span>
        </div>

        {timeLeft !== null && (
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
              isTimeUp
                ? 'bg-slate-800 text-slate-400'
                : timeLeft <= 5
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-pulse'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{isTimeUp ? 'Time Ended' : `${timeLeft}s`}</span>
          </div>
        )}
      </div>

      {/* Answer Feedback Banner (Only after timer hits 0) */}
      {isTimeUp ? (
        <div
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold my-1 animate-fade-in ${
            userGotItRight
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
          }`}
        >
          {userGotItRight ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Correct Answer! 🎉</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>
                {submittedOptionIndex === null ? "Time's up! You didn't submit an answer" : 'Wrong Answer ❌'}
              </span>
            </>
          )}
        </div>
      ) : isLockedInEarly ? (
        <div className="py-2 px-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-between my-1 animate-fade-in">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold">Answer Locked</span>
          </div>
          <span className="text-[11px] font-mono bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-200">
            Pick: {optionList[submittedOptionIndex]?.label}
          </span>
        </div>
      ) : null}

      {/* Question Text */}
      <div className="bg-[#131b2e] border border-slate-800 p-3 rounded-xl shadow-lg my-1 flex-shrink-0">
        <h2 className="text-xs sm:text-sm font-semibold leading-snug text-slate-100">
          {currentQuestion.question_text}
        </h2>
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col justify-center space-y-1.5 py-1">
        {optionList.map((opt, idx) => {
          const isSelected = selectedOptionIndex === idx;
          const isSubmitted = submittedOptionIndex === idx;

          const isCorrect = isTimeUp && idx === dbCorrectIndex;
          const isWrongPick = isTimeUp && isSubmitted && idx !== dbCorrectIndex;

          return (
            <button
              key={opt.label}
              onClick={() => handleOptionSelect(idx)}
              disabled={submittedOptionIndex !== null || isTimeUp}
              className={`w-full px-3 py-2 sm:py-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                isCorrect
                  ? 'bg-emerald-950/70 border-emerald-500 text-white ring-1 ring-emerald-500'
                  : isWrongPick
                  ? 'bg-rose-950/70 border-rose-500 text-white'
                  : isSubmitted && !isTimeUp
                  ? 'bg-indigo-900/40 border-indigo-500 text-white'
                  : isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                  : isLockedInEarly
                  ? 'bg-[#131b2e]/60 border-slate-800/50 text-slate-500'
                  : 'bg-[#131b2e] border-slate-800/80 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
                    isCorrect
                      ? 'bg-emerald-500 text-black'
                      : isWrongPick
                      ? 'bg-rose-500 text-white'
                      : isSelected || isSubmitted
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-xs sm:text-sm font-normal truncate">{opt.text}</span>
              </div>

              {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              {isWrongPick && <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Bottom Action Button */}
      <div className="pt-2 border-t border-slate-800/80 flex-shrink-0">
        {isTimeUp ? (
          <div className="w-full text-center py-2 bg-slate-800/40 border border-slate-700/50 rounded-xl text-slate-400 text-xs">
            Next question starting soon...
          </div>
        ) : isLockedInEarly ? (
          <div className="w-full text-center py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 font-medium text-xs flex items-center justify-center gap-1.5">
            <span>Reveal in {timeLeft}s</span>
          </div>
        ) : (
          <Button
            onClick={submitAnswer}
            disabled={selectedOptionIndex === null || submitting || isTimeUp}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-semibold text-xs sm:text-sm disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </Button>
        )}
      </div>
    </div>
  );
}