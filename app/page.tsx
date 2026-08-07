'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, ScanLine, Trophy, BarChart3, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const registerUrl = `${origin}/register`;
  const qrSrc = origin ? `/api/qr?url=${encodeURIComponent(registerUrl)}` : '';

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 glass sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Office Quiz</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/register">
              <Button variant="ghost" size="sm">Join</Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" size="sm">Admin</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="container mx-auto max-w-6xl px-4 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
              <Zap className="w-3.5 h-3.5" /> Live Real-time Trivia
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              The Office
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Quiz Challenge
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed">
              Scan to join, register in seconds, and race your teammates through
              fast-paced questions. One question. Five options. Five seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="group">
                  Join the Quiz
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="outline">Admin Dashboard</Button>
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              <Feature icon={<ScanLine className="w-4 h-4" />} label="Scan to join" />
              <Feature icon={<Trophy className="w-4 h-4" />} label="Live leaderboard" />
              <Feature icon={<BarChart3 className="w-4 h-4" />} label="Instant analytics" />
            </div>
          </div>

          {/* QR Card */}
          <div className="flex justify-center lg:justify-end animate-fade-in">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl rounded-3xl" />
              <div className="relative glass border border-border rounded-3xl p-6 sm:p-8 w-fit">
                <div className="text-center mb-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Scan to play</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-lg">
                  {qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrSrc} alt="QR code to join the quiz" width={220} height={220} className="block" />
                  ) : (
                    <div className="w-[220px] h-[220px] bg-muted animate-pulse rounded" />
                  )}
                </div>
                <p className="text-center mt-4 text-sm text-muted-foreground break-all">
                  {registerUrl || 'Loading…'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            Server-validated answers · one response per participant
          </div>
          <span>10 teams · 5-second rounds · live scoring</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  );
}
