/**
 * Reporting/admin query layer — server-side reads via the service-role key.
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin';

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

export interface CategoryStat {
  decline_category: string;
  attempts: number;
  recovered: number;
  recovery_rate_pct: number;
  avg_time_to_recovery_hours: number | null;
}

export interface Overview {
  totalCycles: number;
  recovered: number;
  recoveryRatePct: number;
  recoveredRevenueCents: number;
  activeCycles: number;
  sendFailures: number;
  byCategory: CategoryStat[];
}

export async function getOverview(): Promise<Overview | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const [
    { count: totalCycles },
    { count: recovered },
    { count: activeCycles },
    { count: sendFailures },
    { data: categoryRows },
    { data: recoveredRows },
  ] = await Promise.all([
    supabase.from('dunning_cycles').select('id', { count: 'exact', head: true }),
    supabase.from('dunning_cycles').select('id', { count: 'exact', head: true }).eq('status', 'recovered'),
    supabase.from('dunning_cycles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('klaviyo_sends').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('recovery_by_category').select('*'),
    supabase.from('dunning_cycles').select('amount_due').eq('status', 'recovered'),
  ]);

  const recoveredRevenueCents = (recoveredRows ?? []).reduce(
    (sum, r) => sum + Number(r.amount_due ?? 0),
    0,
  );
  const recoveryRatePct = totalCycles
    ? Math.round(((recovered ?? 0) / totalCycles) * 1000) / 10
    : 0;

  return {
    totalCycles: totalCycles ?? 0,
    recovered: recovered ?? 0,
    recoveryRatePct,
    recoveredRevenueCents,
    activeCycles: activeCycles ?? 0,
    sendFailures: sendFailures ?? 0,
    byCategory: (categoryRows ?? []) as CategoryStat[],
  };
}

export interface FeedEvent {
  kind: 'webhook' | 'klaviyo';
  id: string;
  title: string;
  subtitle: string;
  at: string;
  status?: string;
}

export async function getRecentFeed(limit = 40): Promise<FeedEvent[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const [{ data: receipts }, { data: sends }] = await Promise.all([
    supabase
      .from('webhook_receipts')
      .select('id, stripe_event_id, event_type, received_at')
      .order('received_at', { ascending: false })
      .limit(limit),
    supabase
      .from('klaviyo_sends')
      .select('id, klaviyo_event_name, status, sent_at, created_at, customers (email)')
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const events: FeedEvent[] = [
    ...(receipts ?? []).map((r: any) => ({
      kind: 'webhook' as const,
      id: r.id,
      title: r.event_type,
      subtitle: r.stripe_event_id,
      at: r.received_at,
    })),
    ...(sends ?? []).map((s: any) => ({
      kind: 'klaviyo' as const,
      id: s.id,
      title: s.klaviyo_event_name,
      subtitle:
        (Array.isArray(s.customers) ? s.customers[0]?.email : s.customers?.email) ?? '',
      status: s.status,
      at: s.sent_at ?? s.created_at,
    })),
  ];

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

export async function getActiveCycles() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('active_dunning_cycles')
    .select('*')
    .order('hours_active', { ascending: false });
  return (data ?? []) as Record<string, any>[];
}

export async function getSendFailures() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('klaviyo_send_failures')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as Record<string, any>[];
}
