'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Users, Hash, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamNo, setTeamNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamName.trim() || !teamNo.trim()) {
      setError('Please fill in all three fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedTeamNo = parseInt(teamNo.trim(), 10) || 1;

      const { data, error: insertError } = await supabase
        .from('participants')
        .insert([
          {
            name: name.trim(),
            team_no: teamName.trim(), // Maps Team Name input to team_no column
            roll_no: parsedTeamNo,     // Maps Team Number input to roll_no column
            score: 0,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        // Construct participant object and save under key expected by play/page.tsx
        const participantObj = {
          id: data.id,
          name: data.name,
          team_name: data.team_no,
          team_no: data.roll_no,
        };

        localStorage.setItem('quiz_participant', JSON.stringify(participantObj));

        // Legacy individual keys fallback
        localStorage.setItem('participant_id', data.id);
        localStorage.setItem('participant_name', data.name);
      }

      window.location.href = '/play';
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to join event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-indigo-500/10 text-indigo-400 mb-2">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Workplace Live Quiz</h1>
          <p className="text-sm text-slate-400">Enter your details to join the live event</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Participant Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Team Name
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Cyber Knights"
                className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Team Number
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="number"
                required
                min="1"
                value={teamNo}
                onChange={(e) => setTeamNo(e.target.value)}
                placeholder="1"
                className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-indigo-600/20"
          >
            {loading ? 'Joining Event...' : 'Join Event'}
          </button>
        </form>
      </div>
    </div>
  );
}