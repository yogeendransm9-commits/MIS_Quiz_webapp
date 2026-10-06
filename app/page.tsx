'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Check, 
  Mail, 
  Loader2, 
  Crown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<'portal' | 'register'>('portal');
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Form State
  const [role, setRole] = useState<'participant' | 'leader'>('participant');
  const [email, setEmail] = useState('');
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

  const detectLeaderName = (emailStr: string): 'Charles' | 'Nandita' | 'Rajeev' | null => {
    const lower = emailStr.toLowerCase();
    if (lower.includes('charles')) return 'Charles';
    if (lower.includes('nandita')) return 'Nandita';
    if (lower.includes('rajeev')) return 'Rajeev';
    return null;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid work email address');
      return;
    }

    let participantPayload: any = {};

    if (role === 'leader') {
      const leaderName = detectLeaderName(trimmedEmail);
      if (!leaderName) {
        setError('Could not identify leader. Email must contain Charles, Nandita, or Rajeev.');
        return;
      }

      participantPayload = {
        role: 'leader',
        leader_id: leaderName,
        display_name: leaderName,
        email: trimmedEmail,
        created_at: new Date().toISOString(),
      };
    } else {
      const fallbackDisplayName = trimmedEmail.split('@')[0];

      participantPayload = {
        role: 'participant',
        email: trimmedEmail,
        display_name: fallbackDisplayName,
        created_at: new Date().toISOString(),
      };
    }

    setLoading(true);

    try {
      const { data, error: insertError } = await supabase
        .from('participants')
        .insert([participantPayload])
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
              <span>Live Executive Quiz</span>
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
              <span>Enter Quiz Arena</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Link href="/admin" className="w-full">
              <Button
                variant="outline"
                className="w-full border-slate-800 bg-[#131b2e] hover:bg-slate-800 text-slate-300 font-semibold py-6 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Admin Host Panel</span>
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

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Join the Quiz</h1>
            <p className="text-xs text-slate-400">Select your role and enter your work email</p>
          </div>

          {/* Role Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[#0b0f19] p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setRole('participant'); setError(''); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'participant'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Participant
            </button>
            <button
              type="button"
              onClick={() => { setRole('leader'); setError(''); }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'leader'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5" /> Leader
            </button>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {role === 'leader' ? 'Leader Email ID' : 'Participant Email ID'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder={role === 'leader' ? 'leader.name@company.com' : 'your.name@company.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 transition-colors"
                />
              </div>
              {role === 'leader' && (
                <p className="text-[11px] text-amber-400/80">
                  Recognizes Charles, Nandita, or Rajeev automatically.
                </p>
              )}
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-center">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className={`w-full py-6 rounded-xl text-sm font-semibold transition-all shadow-lg ${
                role === 'leader'
                  ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-amber-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entering Room...
                </>
              ) : role === 'leader' ? (
                'Enter as Leader'
              ) : (
                'Enter as Participant'
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}