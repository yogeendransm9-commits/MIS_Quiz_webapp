'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Incorrect password');
        setLoading(false);
        return;
      }
      toast.success('Welcome, admin');
      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
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
          <Link href="/"><Button variant="ghost" size="sm">Home</Button></Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Access</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter the admin password to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="glass border border-border rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pw" className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" /> Password
              </Label>
              <Input
                id="pw"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Admin password"
                disabled={loading}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</> : 'Enter Dashboard'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
