'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Play, SkipForward, CheckCircle, QrCode } from 'lucide-react';

export default function DashboardClient() {
  const [participantCount, setParticipantCount] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [quizStatus, setQuizStatus] = useState('waiting');
  const [qrUrl, setQrUrl] = useState('');
  const supabase = createClient();

  useEffect(() => {
    setQrUrl(`${window.location.origin}/api/qr`);
    fetchQuestions();

    // Subscribe to participant registrations
    const channel = supabase
      .channel('participants_count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants' }, () => {
        setParticipantCount((prev) => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('id');
    if (data) setQuestions(data);
  };

  const startQuiz = async () => {
    setQuizStatus('active');
    await nextQuestion(0);
  };

  const nextQuestion = async (index: number) => {
    if (index >= questions.length) {
      await supabase.from('quiz_state').update({ status: 'completed' }).eq('id', 1);
      setQuizStatus('completed');
      return;
    }

    setCurrentIdx(index);
    const q = questions[index];
    const endTime = new Date(Date.now() + 30 * 1000).toISOString();

    await supabase.from('quiz_state').upsert({
      id: 1,
      status: 'active',
      current_question_id: q.id,
      end_time: endTime,
      duration: 30,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Event Controller</h1>
          <p className="text-slate-400 text-sm">250 Live Participants Support Enabled</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg">
          <Users className="w-5 h-5 text-indigo-400" />
          <span className="text-lg font-bold">{participantCount}</span>
          <span className="text-slate-400 text-sm">Live Joined</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <Card className="bg-slate-900 border-slate-800 flex flex-col items-center justify-center p-6 text-center">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-400" />
              Scan to Register & Play
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {qrUrl && <img src={qrUrl} alt="QR Code" className="w-48 h-48 rounded-lg border border-slate-700" />}
            <p className="text-xs text-slate-400">Direct your workplace screen/projector to this QR code</p>
          </CardContent>
        </Card>

        {/* Live Controls */}
        <Card className="bg-slate-900 border-slate-800 p-6 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quiz Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quizStatus === 'waiting' && (
              <Button onClick={startQuiz} className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                <Play className="w-5 h-5 mr-2" /> Start Quiz Event
              </Button>
            )}

            {quizStatus === 'active' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <p className="text-xs text-slate-400">Current Question ({currentIdx + 1}/{questions.length})</p>
                  <p className="font-semibold text-base mt-1">{questions[currentIdx]?.question_text}</p>
                </div>
                <Button
                  onClick={() => nextQuestion(currentIdx + 1)}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  <SkipForward className="w-5 h-5 mr-2" /> Push Next Question
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}