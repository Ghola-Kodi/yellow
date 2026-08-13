'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@admin.cpm');
  const [password, setPassword] = useState('admin123');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { signInWithPassword, signInWithGoogle, loading } = useAuth();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const result = await signInWithPassword(email, password);
    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage('Signed in successfully. Redirecting...');
    window.setTimeout(() => router.push('/dashboard'), 500);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setMessage(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.url) {
      window.location.href = result.url;
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-6 lg:max-w-xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
            <Shield className="h-4 w-4 text-emerald-400" />
            Built for secure Stripe + Klaviyo sign-in
          </div>
          <div>
            <h1 className="text-4xl font-semibold text-white sm:text-5xl">Sign in to your dashboard</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">
              Use Google auth or the demo login to access the recovery dashboard and simulation tools.
            </p>
          </div>
          <div className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Demo access</p>
                <p className="text-sm font-semibold text-white">admin@admin.cpm</p>
              </div>
              <Badge variant="info">No setup needed</Badge>
            </div>
            <p className="text-sm text-slate-500">Use the demo credentials above when Supabase auth is not yet connected.</p>
          </div>
        </div>

        <Card className="w-full max-w-xl p-8">
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Welcome back</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Login to continue</h2>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-700 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-slate-700 text-[0.65rem] font-bold">G</span>
              Continue with Google
            </button>

            <div className="relative text-center text-xs uppercase tracking-[0.3em] text-slate-500">
              <span className="bg-slate-950 px-3">or</span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 w-full"
                    required
                  />
                </div>
              </div>
              {(error || message) && (
                <div className={`rounded-2xl px-4 py-3 text-sm ${error ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}`}>
                  {error || message}
                </div>
              )}
              <Button type="submit" disabled={loading} variant="default" className="w-full">
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-400">
              New here?{' '}
              <Link href="/signup" className="font-semibold text-white hover:text-slate-100">
                Create an account
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}

