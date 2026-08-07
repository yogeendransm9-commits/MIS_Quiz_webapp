'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, ScanLine, Trophy, BarChart3, ShieldCheck, Zap, ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const [registerUrl, setRegisterUrl] = useState('');
  const [qrSrc, setQrSrc] = useState('');
  const [participantCount, setParticipantCount] = useState<number | null>(null);

  useEffect(() => {
    const host = window.location.host;
    const protocol = window.location.protocol;
    const baseUrl = `${protocol}//${host}`;
    const targetUrl = `${baseUrl}/register`;
    
    setRegisterUrl(targetUrl);
    setQrSrc(`/api/qr?url=${encodeURIComponent(targetUrl)}`);

    fetchParticipants();

    const channel = supabase
      .channel('landing_page_participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants' },
        () => fetchParticipants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchParticipants = async () => {
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true });
    setParticipantCount(count || 0);
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#0b0f19] text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#131b2e]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Office Quiz</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/register">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
                Join
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Admin
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="container mx-auto max-w-6xl px-4 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <Zap className="w-3.5 h-3.5" /> Live Real-time Trivia
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              The Office
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Quiz Challenge
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              Scan to join, register in seconds, and race your teammates through fast-paced questions. One question. Five options. Live countdown.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/register">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium group px-6">
                  Join the Quiz
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="outline" className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200">
                  Admin Dashboard
                </Button>
              </Link>
            </div>

            <div className="pt-4 grid grid-cols-3 gap-4 max-w-md border-t border-slate-800/80">
              <Feature icon={<ScanLine className="w-4 h-4" />} label="Scan to join" />
              <Feature icon={<Trophy className="w-4 h-4" />} label="Live leaderboard" />
              <Feature icon={<BarChart3 className="w-4 h-4" />} label="Instant responses" />
            </div>
          </div>

          {/* QR Card */}
          <div className="flex justify-center lg:justify-end animate-fade-in">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-2xl rounded-3xl" />
              <div className="relative bg-[#131b2e] border border-slate-800 rounded-3xl p-6 sm:p-8 w-fit shadow-2xl space-y-4">
                <div className="text-center flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Scan to Play</p>
                  {participantCount !== null && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Users className="w-3 h-3" /> {participantCount} Joined
                    </span>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-xl">
                  {qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrSrc}
                      alt="QR code to join the quiz"
                      width={220}
                      height={220}
                      className="block mx-auto rounded"
                    />
                  ) : (
                    <div className="w-[220px] h-[220px] bg-slate-200 animate-pulse rounded" />
                  )}
                </div>

                <p className="text-center text-xs text-slate-400 max-w-[220px] truncate mx-auto">
                  {registerUrl || 'Generating link…'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <footer className="border-t border-slate-800/80 py-6 bg-[#0b0f19]">
        <div className="container mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Server-validated answers · one response per participant
          </div>
          <span>Live real-time quiz control platform</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <span className="text-indigo-400">{icon}</span>
      {label}
    </div>
  );
}