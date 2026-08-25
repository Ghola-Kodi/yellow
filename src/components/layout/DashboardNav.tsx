"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function DashboardNav() {
  const router = useRouter();
  const { user, loading, initUser, signOut } = useAuth();

  useEffect(() => {
    initUser();
  }, [initUser]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-300 text-slate-950 shadow-sm">
            R
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Revivo</p>
            <p className="text-xs text-slate-500">Demo</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-2 ml-6">
          <Link href="/dashboard/simulator" className="text-sm text-slate-300 hover:text-white">Simulator</Link>
          <Link href="/dashboard/failures" className="text-sm text-slate-300 hover:text-white">Failures</Link>
          <Link href="/dashboard/flows" className="text-sm text-slate-300 hover:text-white">Flows</Link>
          <Link href="/dashboard/settings" className="text-sm text-slate-300 hover:text-white">Settings</Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-xs text-slate-400">Signed in as</div>
          <div className="text-sm font-medium text-white">{user?.email ?? 'guest'}</div>
        </div>

        <Button variant="outline" size="sm" onClick={() => router.push('/')}>
          Home
        </Button>

        <Button variant="destructive" size="sm" onClick={handleSignOut}>
          Log out
        </Button>
      </div>
    </div>
  );
}
