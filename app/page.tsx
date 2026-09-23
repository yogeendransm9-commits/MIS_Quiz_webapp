'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, Users, ShieldCheck, ArrowRight, ArrowLeft, Copy, Check, Mail, Loader2, Sparkle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<'portal' | 'register'>('portal');
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [teamChoice, setTeamChoice] = useState<'V' | 'T'>('V');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinUrl(window.location.href);
    }
  }, []);

  const copyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const fallbackName = trimmedEmail.split('@')[0];

      const { data, error: insertError } = await supabase
        .from('participants')
        .insert([
          {
            email: trimmedEmail,
            name: fallbackName,
            team_id: teamChoice,
            team_name: teamChoice === 'V' ? 'Vibe' : 'Tribe',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      localStorage.setItem('quiz_participant', JSON.stringify(data));
      router.push('/play');
    } catch (err: any) {
      console.error('Error joining quiz:', err);
      setError(err.message || 'Failed to join. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-4 sm:p-6">
      {view === 'portal' ? (
        <div className="w-full max-w-md flex flex-col items-center space-y-6 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-indigo-400 font-semibold text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workplace Live Quiz</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Scan or Click to Join</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Scan the QR code with your mobile camera or join directly below.
            </p>
          </div>

          <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 w-full">
            <div className="bg-white p-3 rounded-2xl shadow-inner flex items-center justify-center">
              {joinUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`}
                  alt="Quiz Join QR Code"
                  className="w-[190px] h-[190px] rounded-lg"
                />
              ) : (
                <div className="w-[190px] h-[190px] bg-slate-200 animate-pulse rounded-lg" />
              )}
            </div>

            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-2 text-xs font-mono bg-slate-800/80 hover:bg-slate-800 text-slate-300 px-3.5 py-2 rounded-xl border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Link Copied!' : joinUrl || 'Generating URL...'}</span>
            </button>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={() => setView('register')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-6 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Users className="w-4 h-4" />
              <span>Join as Participant</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Link href="/admin" className="w-full">
              <Button
                variant="outline"
                className="w-full border-slate-800 bg-[#131b2e] hover:bg-slate-800 text-slate-300 font-semibold py-6 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Admin Portal</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-[#131b2e] border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 relative">
          <button
            type="button"
            onClick={() => setView('portal')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to QR Code
          </button>

          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Join the Quiz</h1>
            <p className="text-xs text-slate-400">Choose your team and enter your corporate email</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Email ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select Your Team
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTeamChoice('V')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    teamChoice === 'V'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10'
                      : 'bg-[#0b0f19] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base">Team V</span>
                    <Sparkle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold">Vibe</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTeamChoice('T')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    teamChoice === 'T'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                      : 'bg-[#0b0f19] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base">Team T</span>
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold">Tribe</span>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-center">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-6 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entering Room...
                </>
              ) : (
                `Enter as Team ${teamChoice} (${teamChoice === 'V' ? 'Vibe' : 'Tribe'})`
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}