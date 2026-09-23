'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  LogOut, 
  Loader2, 
  Users,
  Sparkle
} from 'lucide-react';

interface Question {
  id: number;
  question_number: number;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  option_5?: string | null;
  correct_option: number;
}

export default function PlayPage() {
  const router = useRouter();

  const [participant, setParticipant] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [quizLive, setQuizLive] = useState<boolean>(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Tracks the active broadcast timestamp and question number to detect transitions
  const lastBroadcastTimeRef = useRef<string | null>(null);
  const activeQuestionIdxRef = useRef<number>(0);

  // 1. Initialize participant session
  useEffect(() => {
    const stored = localStorage.getItem('quiz_participant');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      setParticipant(JSON.parse(stored));
    } catch {
      router.push('/');
      return;
    }
    setLoadingInitial(false);
  }, [router]);

  // 2. Question fetching helper
  const fetchTargetQuestion = async (qNum: number): Promise<Question | null> => {
    const { data: qByNum } = await supabase
      .from('questions')
      .select('*')
      .eq('question_number', qNum)
      .maybeSingle();

    if (qByNum) return qByNum as Question;

    const { data: allQuestions } = await supabase
      .from('questions')
      .select('*')
      .order('id', { ascending: true });

    if (allQuestions && allQuestions.length >= qNum && qNum > 0) {
      return allQuestions[qNum - 1] as Question;
    }

    return null;
  };

  // 3. Synchronize with quiz_state
  const syncQuizState = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_state')
        .select('*')
        .order('id', { ascending: true })
        .limit(1);

      if (error || !data || data.length === 0) return;

      const state = data[0];
      const isLive = Boolean(state.is_live);
      const targetIdx = Number(state.active_question_index || 0);
      const broadcastTime = state.question_start_time || state.updated_at;
      const configuredDuration = Number(state.timer_duration || 10);

      setQuizLive(isLive);
      setActiveQuestionIdx(targetIdx);

      if (isLive && targetIdx > 0) {
        // Detect a new broadcast event (either new question OR host re-broadcasted)
        const isNewBroadcast = 
          lastBroadcastTimeRef.current !== broadcastTime || 
          activeQuestionIdxRef.current !== targetIdx;

        if (isNewBroadcast) {
          lastBroadcastTimeRef.current = broadcastTime;
          activeQuestionIdxRef.current = targetIdx;

          // FIX 2: Reset submission lock completely for the new question
          setSelectedOption(null);
          setIsSubmitted(false);
          setSubmitting(false);
          setErrorMsg('');

          // FIX 1: Set timer directly to configured duration, avoiding device clock skew
          setTimeLeft(configuredDuration);

          // Fetch the question
          const qData = await fetchTargetQuestion(targetIdx);
          if (qData) {
            setCurrentQuestion(qData);

            // Check if user previously submitted for THIS exact question
            const stored = localStorage.getItem('quiz_participant');
            const pId = stored ? JSON.parse(stored)?.id : participant?.id;

            if (pId) {
              const { data: existingAns } = await supabase
                .from('answers')
                .select('selected_option')
                .eq('participant_id', pId)
                .eq('question_id', qData.id)
                .maybeSingle();

              if (existingAns) {
                setSelectedOption(existingAns.selected_option);
                setIsSubmitted(true);
              }
            }
          }
        }
      } else {
        // Waiting room state
        lastBroadcastTimeRef.current = null;
        activeQuestionIdxRef.current = 0;
        setCurrentQuestion(null);
        setSelectedOption(null);
        setIsSubmitted(false);
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Quiz state sync error:', err);
    }
  };

  // 4. Polling & Realtime Subscription
  useEffect(() => {
    syncQuizState();

    const poll = setInterval(() => {
      syncQuizState();
    }, 1000);

    const sub = supabase
      .channel('play_quiz_live_sync_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_state' }, () => {
        syncQuizState();
      })
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(sub);
    };
  }, [participant]);

  // 5. Active Countdown tick
  useEffect(() => {
    if (!quizLive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [quizLive, timeLeft]);

  // 6. Handle Answer Submission
  const handleSelectOption = async (optionNum: number) => {
    if (isSubmitted || timeLeft <= 0 || submitting || !participant?.id || !currentQuestion?.id) {
      return;
    }

    setSelectedOption(optionNum);
    setSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('answers').insert([
        {
          participant_id: participant.id,
          question_id: currentQuestion.id,
          selected_option: optionNum,
          submitted_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        // Code 23505 = already submitted for this question
        if (error.code === '23505') {
          setIsSubmitted(true);
        } else {
          throw error;
        }
      } else {
        setIsSubmitted(true);
      }
    } catch (err: any) {
      console.error('Answer submission error:', err);
      setErrorMsg(err.message || 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = () => {
    localStorage.removeItem('quiz_participant');
    router.push('/');
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isTeamV = participant?.team_id === 'V';

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col justify-between p-4 sm:p-6 max-w-xl mx-auto">
      {/* Top Participant Status Header */}
      <div className="bg-[#131b2e] border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border ${
              isTeamV
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {isTeamV ? <Sparkle className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Team</span>
              <span
                className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                  isTeamV ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {isTeamV ? 'V (Vibe)' : 'T (Tribe)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs">{participant?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLeave}
          title="Exit Quiz"
          className="text-slate-500 hover:text-slate-300 transition-colors p-2"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Main Play Area */}
      <div className="my-auto py-6">
        {!quizLive || activeQuestionIdx <= 0 || !currentQuestion ? (
          /* WAITING ROOM */
          <div className="bg-[#131b2e] border border-slate-800 p-8 rounded-3xl text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">You're in the Waiting Room</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Hold tight! The host will broadcast the next question shortly.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-full text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Connected as Team {participant?.team_id}</span>
            </div>
          </div>
        ) : (
          /* ACTIVE QUESTION */
          <div className="space-y-5">
            <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  Question {currentQuestion.question_number || activeQuestionIdx}
                </span>

                <div
                  className={`flex items-center gap-1.5 font-mono font-bold text-sm px-3 py-1 rounded-full border ${
                    timeLeft <= 3
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 animate-bounce'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeLeft}s</span>
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-semibold text-slate-100 leading-snug">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {[
                { num: 1, text: currentQuestion.option_1 },
                { num: 2, text: currentQuestion.option_2 },
                { num: 3, text: currentQuestion.option_3 },
                { num: 4, text: currentQuestion.option_4 },
                ...(currentQuestion.option_5 ? [{ num: 5, text: currentQuestion.option_5 }] : []),
              ].map((opt) => {
                const isSelected = selectedOption === opt.num;
                const isDisabled = isSubmitted || timeLeft <= 0 || submitting;

                return (
                  <button
                    key={opt.num}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectOption(opt.num)}
                    className={`w-full p-4 rounded-2xl border text-left font-medium text-sm flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                        : isSubmitted
                        ? 'bg-[#131b2e]/50 border-slate-800/80 text-slate-500 cursor-not-allowed'
                        : 'bg-[#131b2e] border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? 'bg-white text-indigo-700'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(64 + opt.num)}
                      </span>
                      <span>{opt.text}</span>
                    </div>

                    {isSelected && <CheckCircle className="w-4 h-4 text-white shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {/* Feedback Banners */}
            {isSubmitted && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Answer submitted! Waiting for next question...</span>
              </div>
            )}

            {!isSubmitted && timeLeft === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Time up! Waiting for next question...</span>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl text-center">
                {errorMsg}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-slate-600 pt-4">
        Workplace Live Quiz • Team Vibe vs Team Tribe
      </div>
    </div>
  );
}