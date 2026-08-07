'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, QrCode, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('participants')
        .insert([{ name: name.trim(), score: 0 }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Store local participant session
      localStorage.setItem('quiz_participant', JSON.stringify(data));
      router.push('/play');
    } catch (err: any) {
      setError(err.message || 'Failed to join quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 mb-2 border border-indigo-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Workplace Live Quiz</h1>
          <p className="text-sm text-slate-400">Enter your name to join the live event</p>
        </div>

        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Participant Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Alex M."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-base"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98]"
              >
                {loading ? 'Joining...' : 'Join Event'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}