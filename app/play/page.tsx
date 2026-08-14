'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, CheckCircle, Clock, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlayPage() {
  const [quizState, setQuizState] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submittedOption, setSubmittedOption] = useState<string | null>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('quiz_participant');
    if (stored) {
      setParticipant(JSON.parse(stored));
    }

    fetchQuizState();

    const channel = supabase
      .channel('play_quiz_state_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_state' },
        (payload) => {
          console.log('Realtime event received on /play:', payload);
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
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQuizState = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('quiz_state').select('*');
    
    if (error) {
      console.error('Error fetching quiz state:', error);
    } else if (data && data.length > 0) {
      const state = data[0];
      console.log('Initial quiz_state fetched:', state);
      setQuizState(state);
      if (state.is_live && state.active_question_index > 0) {
        await fetchQuestion(state.active_question_index);
      }
    } else {
      console.log('No rows returned from quiz_state. Check table contents or RLS.');
    }
    setLoading(false);
  };

  const fetchQuestion = async (qIndex: number) => {
    if (!qIndex) return;

    console.log('Fetching question for index:', qIndex);

    let { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('question_number', Number(qIndex))
      .maybeSingle();

    if (error) console.error('Error fetching question by question_number:', error);

    if (!data) {
      const res = await supabase
        .from('questions')
        .select('*')
        .eq('id', qIndex)
        .maybeSingle();
      data = res.data;
      if (res.error) console.error('Error fetching question by id:', res.error);
    }

    console.log('Fetched question data:', data);

    if (data) {
      setCurrentQuestion(data);
      setSelectedOption(null);
      setSubmittedOption(null);
    }
  };

  const handleOptionSelect = (optionKey: string) => {
    if (submittedOption) return;
    setSelectedOption(optionKey);
  };

  const submitAnswer = async () => {
    if (!selectedOption || !currentQuestion || !participant) return;
    setSubmitting(true);

    const { error } = await supabase.from('responses').insert({
      participant_id: participant.id,
      question_id: currentQuestion.id || currentQuestion.question_number,
      selected_option: selectedOption,
    });

    if (error) {
      console.error('Error submitting answer:', error);
    } else {
      setSubmittedOption(selectedOption);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
        <p className="text-slate-400 text-sm">Connecting to quiz room...</p>
      </div>
    );
  }

  // WAITING ROOM SCREEN
  if (!quizState || !quizState.is_live || !currentQuestion || quizState.active_question_index <= 0) {
    if (quizState?.active_question_index === -1) {
      return (
        <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-6">
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Quiz Finished!</h1>
          <p className="text-slate-400 max-w-xs text-sm">Look at the main screen to see final results.</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 animate-pulse">
          <Clock className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Waiting for Host</h1>
        <p className="text-slate-400 max-w-xs text-sm">
          You are connected! Get ready, the next question will appear here automatically when the host broadcasts it.
        </p>
      </div>
    );
  }

  // ACTIVE QUESTION SCREEN
  const options = [
    { key: 'A', text: currentQuestion.option_a },
    { key: 'B', text: currentQuestion.option_b },
    { key: 'C', text: currentQuestion.option_c },
    { key: 'D', text: currentQuestion.option_d },
    { key: 'E', text: currentQuestion.option_e },
  ].filter((opt) => opt.text);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4 sm:p-6 max-w-lg mx-auto flex flex-col justify-between">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-sm">Question {currentQuestion.question_number || ''}</span>
          </div>
          {submittedOption && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" /> Answer Submitted
            </span>
          )}
        </div>

        {/* Question Text */}
        <div className="bg-[#131b2e] border border-slate-800 p-5 rounded-2xl shadow-xl">
          <h2 className="text-lg font-bold leading-snug">{currentQuestion.question_text}</h2>
        </div>

        {/* Options List */}
        <div className="space-y-3">
          {options.map((opt) => {
            const isSelected = selectedOption === opt.key;
            const isSubmitted = submittedOption === opt.key;

            return (
              <button
                key={opt.key}
                onClick={() => handleOptionSelect(opt.key)}
                disabled={!!submittedOption}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  isSubmitted
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-[#131b2e] border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                      isSubmitted
                        ? 'bg-emerald-500 text-black'
                        : isSelected
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {opt.key}
                  </span>
                  <span className="text-sm font-medium">{opt.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      {!submittedOption && (
        <div className="pt-6">
          <Button
            onClick={submitAnswer}
            disabled={!selectedOption || submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-xl font-semibold text-base"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </Button>
        </div>
      )}
    </div>
  );
}