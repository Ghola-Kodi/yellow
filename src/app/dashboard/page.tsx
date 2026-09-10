'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Clock,
  Mail,
  RefreshCw,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

type Overview = {
  totalCycles: number;
  recovered: number;
  recoveryRatePct: number;
  recoveredRevenueCents: number;
  activeCycles: number;
  sendFailures: number;
  byCategory: {
    decline_category: string;
    attempts: number;
    recovered: number;
    recovery_rate_pct: number;
    avg_time_to_recovery_hours: number | null;
  }[];
};

type FeedEvent = {
  kind: 'webhook' | 'klaviyo';
  id: string;
  title: string;
  subtitle: string;
  at: string;
  status?: string;
};

type ActiveCycle = {
  id: string;
  email: string;
  stripe_subscription_id: string;
  invoice_id: string;
  amount_due: number;
  amount_remaining: number;
  stripe_retry_count: number;
  hours_active: number;
};

type SendFailure = {
  id: string;
  email: string;
  klaviyo_event_name: string;
  error: string;
  retry_count: number;
  created_at: string;
};

function fmtUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    (cents ?? 0) / 100,
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CATEGORY_LABELS: Record<string, string> = {
  soft_retry: 'Soft retry',
  hard_update_required: 'Update card',
  auth_required: 'Auth required',
  final_notice: 'Final notice',
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [cycles, setCycles] = useState<ActiveCycle[]>([]);
  const [failures, setFailures] = useState<SendFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ov, fd, adm] = await Promise.all([
        fetch('/api/reporting/overview').then((r) => r.json()),
        fetch('/api/reporting/feed').then((r) => r.json()),
        fetch('/api/admin/overview').then((r) => r.json()),
      ]);
      if (ov?.ok) setOverview(ov.overview);
      else if (ov?.error === 'Supabase not configured') setNotConfigured(true);
      if (fd?.ok) setFeed(fd.events ?? []);
      if (adm?.ok) {
        setCycles(adm.cycles ?? []);
        setFailures(adm.failures ?? []);
      }
    } catch {
      // transient network error — keep last good state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function cancelCycle(cycleId: string) {
    await fetch('/api/admin/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId }),
    });
    load();
  }

  if (notConfigured) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
        <h2 className="mt-4 text-lg font-semibold text-white">Supabase not configured</h2>
        <p className="mt-2 text-sm text-slate-400">
          Add <code className="rounded bg-slate-800 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-slate-800 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to{' '}
          <code className="rounded bg-slate-800 px-1">.env.local</code> and run the migrations to
          see live dunning data.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Dunning Engine</h1>
          <p className="text-sm text-slate-400">
            Stripe → Supabase → Klaviyo revenue recovery, end to end
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
          <button
            onClick={load}
            className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-gray-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Recovery rate"
          value={overview ? `${overview.recoveryRatePct}%` : '—'}
          sub={`${overview?.recovered ?? 0} of ${overview?.totalCycles ?? 0} cycles`}
          accent="text-emerald-400"
        />
        <StatCard
          icon={Wallet}
          label="Recovered revenue"
          value={overview ? fmtUsd(overview.recoveredRevenueCents) : '—'}
          sub="from recovered invoices"
          accent="text-blue-400"
        />
        <StatCard
          icon={Clock}
          label="Active cycles"
          value={overview ? String(overview.activeCycles) : '—'}
          sub="currently in dunning"
          accent="text-amber-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Send failures"
          value={overview ? String(overview.sendFailures) : '—'}
          sub="Klaviyo calls that failed"
          accent={overview && overview.sendFailures > 0 ? 'text-red-400' : 'text-slate-400'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live feed */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/40">
          <div className="flex items-center gap-2 border-b border-gray-800 p-4">
            <Activity className="h-4 w-4 text-slate-400" />
            <h3 className="font-semibold text-white">Live feed</h3>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {feed.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                {loading ? 'Loading…' : 'No events yet — trigger a failure from the simulator.'}
              </p>
            ) : (
              feed.map((e) => (
                <div key={`${e.kind}-${e.id}`} className="flex items-start gap-3 rounded-lg p-2 hover:bg-gray-800/40">
                  <div
                    className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      e.kind === 'webhook'
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-purple-500/15 text-purple-400'
                    }`}
                  >
                    {e.kind === 'webhook' ? <Zap className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{e.title}</p>
                    <p className="truncate text-xs text-slate-500">{e.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(e.at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recovery by category */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-gray-800 p-4">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <h3 className="font-semibold text-white">Recovery by decline category</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Recovered</th>
                  <th className="px-4 py-3 font-medium">Recovery rate</th>
                  <th className="px-4 py-3 font-medium">Avg time to recover</th>
                </tr>
              </thead>
              <tbody>
                {overview?.byCategory?.length ? (
                  overview.byCategory.map((row) => (
                    <tr key={row.decline_category} className="border-b border-gray-800/50">
                      <td className="px-4 py-3 text-white">
                        {CATEGORY_LABELS[row.decline_category] ?? row.decline_category}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.attempts}</td>
                      <td className="px-4 py-3 text-slate-300">{row.recovered}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                          {row.recovery_rate_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {row.avg_time_to_recovery_hours != null
                          ? `${row.avg_time_to_recovery_hours}h`
                          : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active cycles */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/40">
          <div className="flex items-center gap-2 border-b border-gray-800 p-4">
            <Clock className="h-4 w-4 text-slate-400" />
            <h3 className="font-semibold text-white">Active dunning cycles</h3>
          </div>
          <div className="divide-y divide-gray-800/50">
            {cycles.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No active cycles.</p>
            ) : (
              cycles.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{c.email}</p>
                    <p className="truncate text-xs text-slate-500">
                      {c.stripe_subscription_id} · {c.invoice_id}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-white">{fmtUsd(c.amount_remaining)}</p>
                      <p className="text-xs text-slate-500">{c.hours_active}h active</p>
                    </div>
                    <button
                      onClick={() => cancelCycle(c.id)}
                      className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-500/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Send failures */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/40">
          <div className="flex items-center gap-2 border-b border-gray-800 p-4">
            <AlertTriangle className="h-4 w-4 text-slate-400" />
            <h3 className="font-semibold text-white">Klaviyo send failures</h3>
          </div>
          <div className="divide-y divide-gray-800/50">
            {failures.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No failed sends. 🎉</p>
            ) : (
              failures.map((f) => (
                <div key={f.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">{f.email}</p>
                    <span className="text-[11px] text-slate-500">{timeAgo(f.created_at)}</span>
                  </div>
                  <p className="text-xs text-red-300">{f.klaviyo_event_name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{f.error}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-800 bg-gray-900/40 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </motion.div>
  );
}
