'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, Trophy, Medal, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Participant, TeamScore, IndividualScore } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<(TeamScore & { rank: number })[]>([]);
  const [individuals, setIndividuals] = useState<(IndividualScore & { rank: number; name: string; team: number; roll_number: string })[]>([]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('leaderboard_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_scores' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'individual_scores' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function load() {
    const [tRes, iRes, pRes] = await Promise.all([
      supabase.from('team_scores').select('*').order('score', { ascending: false }),
      supabase.from('individual_scores').select('*').order('score', { ascending: false }),
      supabase.from('participants').select('id, name, team, roll_number'),
    ]);
    const teamList = (tRes.data as TeamScore[] || []).map((t, i) => ({ ...t, rank: i + 1 }));
    setTeams(teamList);
    const participants = new Map((pRes.data as Participant[] || []).map((p) => [p.id, p]));
    const indivList = (iRes.data as IndividualScore[] || [])
      .map((s) => {
        const p = participants.get(s.participant_id);
        return { ...s, rank: 0, name: p?.name ?? 'Unknown', team: p?.team ?? 0, roll_number: p?.roll_number ?? '' };
      })
      .sort((a, b) => b.score - a.score)
      .map((s, i) => ({ ...s, rank: i + 1 }));
    setIndividuals(indivList);
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 glass sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">Office Quiz</span>
          </Link>
          <Link href="/admin"><Button variant="outline" size="sm">Admin</Button></Link>
        </div>
      </header>

      <div className="flex-1 px-4 py-8">
        <div className="max-w-3xl mx-auto animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-warning/15 border border-warning/30 items-center justify-center mb-3">
              <Trophy className="w-7 h-7 text-warning" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground mt-1">Live standings · updates in real time</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="team">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="team"><Users className="w-4 h-4 mr-2" /> Teams</TabsTrigger>
                <TabsTrigger value="individual"><Trophy className="w-4 h-4 mr-2" /> Individuals</TabsTrigger>
              </TabsList>

              <TabsContent value="team" className="animate-fade-in">
                <div className="glass border border-border rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-3 px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                    <span>Rank</span><span>Team</span><span className="text-right">Score</span>
                  </div>
                  {teams.map((t) => <TeamRow key={t.team} rank={t.rank} team={t.team} score={t.score} />)}
                </div>
              </TabsContent>

              <TabsContent value="individual" className="animate-fade-in">
                <div className="glass border border-border rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                    <span className="col-span-2">Rank</span>
                    <span className="col-span-5">Name</span>
                    <span className="col-span-2">Team</span>
                    <span className="col-span-2">Roll</span>
                    <span className="col-span-1 text-right">Score</span>
                  </div>
                  {individuals.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">No scores yet.</p>
                  ) : (
                    individuals.map((p) => (
                      <div key={p.participant_id} className="grid grid-cols-12 px-4 py-3 items-center border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <span className="col-span-2 flex items-center gap-2">
                          <RankBadge rank={p.rank} />
                        </span>
                        <span className="col-span-5 font-medium truncate">{p.name}</span>
                        <span className="col-span-2 text-muted-foreground text-sm">Team {p.team}</span>
                        <span className="col-span-2 text-muted-foreground text-sm">{p.roll_number}</span>
                        <span className="col-span-1 text-right font-bold text-primary">{p.score}</span>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </main>
  );
}

function TeamRow({ rank, team, score }: { rank: number; team: number; score: number }) {
  return (
    <div className="grid grid-cols-3 px-4 py-3 items-center border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
      <span className="flex items-center gap-2"><RankBadge rank={rank} /></span>
      <span className="font-medium">Team {team}</span>
      <span className="text-right font-bold text-primary text-lg">{score}</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="w-5 h-5 text-warning" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
  return <span className="text-sm text-muted-foreground w-5 text-center">{rank}</span>;
}
