'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, User, Hash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function JoinQuizPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Enforces 1 letter + 1-2 digits (e.g. R1, G10, B24)
  const handleTeamIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();

    // 1st character must be a letter
    if (val.length === 1 && !/^[A-Z]$/.test(val)) return;
    // 2nd and 3rd characters must be digits
    if (val.length > 1 && !/^[A-Z][0-9]{1,2}$/.test(val)) return;
    // Cap at 3 characters maximum
    if (val.length > 3) return;

    setTeamId(val);
    setError('');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedTeamId = teamId.trim().toUpperCase();

    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }

    // Validation: 1 alphabet character + 1 or 2 digits
    const teamIdRegex = /^[A-Z][0-9]{1,2}$/;
    if (!teamIdRegex.test(trimmedTeamId)) {
      setError('Team ID must be 1 letter followed by 1 or 2 digits (e.g. R1, G10, B24)');
      return;
    }

    setLoading(true);

    try {
      // Inserts into participants table
      const { data, error: insertError } = await supabase
        .from('participants')
        .insert([
          {
            name: trimmedName,
            team_id: trimmedTeamId,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Persist participant session in localStorage
      localStorage.setItem('quiz_participant', JSON.stringify(data));

      // Redirect to participant game room
      router.push('/play');
    } catch (err: any) {
      console.error('Error joining quiz:', err);
      setError(err.message || 'Failed to join. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#131b2e] border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
        {/* Header Icon */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">Workplace Live Quiz</h1>
          <p className="text-xs text-slate-400">Enter your details to join the live event</p>
        </div>

        {/* Join Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          {/* Participant Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Participant Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          {/* Single Team ID Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Team ID
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Ex: R1, G10, B24</span>
            </div>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={3}
                placeholder="R1, G10, B24"
                value={teamId}
                onChange={handleTeamIdChange}
                required
                className="w-full bg-[#0b0f19] border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono uppercase placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-center">
              {error}
            </p>
          )}

          {/* Submit Action */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-6 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...
              </>
            ) : (
              'Join Event'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}