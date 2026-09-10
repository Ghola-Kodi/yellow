import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { PaymentFailureRecord, PaymentStatus } from '@/types/database';

const normalizePaymentFailure = (record: Partial<PaymentFailureRecord>): PaymentFailureRecord => {
  const amountCents = Number(record.amount_cents ?? record.amount ?? 0);

  return {
    ...record,
    id: record.id ?? crypto.randomUUID(),
    customer_email: record.customer_email ?? 'unknown@example.com',
    stripe_customer_id: record.stripe_customer_id ?? record.customer_id ?? null,
    amount: amountCents,
    amount_cents: amountCents,
    currency: record.currency ?? 'usd',
    status: (record.status ?? 'pending') as PaymentStatus,
    decline_type: record.decline_type ?? 'soft',
    decline_code: record.decline_code ?? null,
    attempt_count: Number(record.attempt_count ?? 1),
    recovery_status: record.recovery_status ?? 'pending',
    klaviyo_flow_status: record.klaviyo_flow_status ?? 'not_sent',
    metadata: record.metadata ?? {},
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? new Date().toISOString(),
  };
};

const getFallbackFailures = (): PaymentFailureRecord[] => [
  normalizePaymentFailure({
    id: 'demo-1',
    stripe_event_id: 'evt_demo_1',
    customer_id: 'cus_demo_1',
    customer_email: 'demo@admin.cpm',
    stripe_customer_id: 'cus_demo_1',
    amount_cents: 12900,
    currency: 'usd',
    status: 'pending',
    decline_type: 'soft',
    decline_code: 'insufficient_funds',
    attempt_count: 1,
    recovery_status: 'pending',
    klaviyo_flow_status: 'not_sent',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  normalizePaymentFailure({
    id: 'demo-2',
    stripe_event_id: 'evt_demo_2',
    customer_id: 'cus_demo_2',
    customer_email: 'customer@acme.test',
    stripe_customer_id: 'cus_demo_2',
    amount_cents: 8400,
    currency: 'usd',
    status: 'recovered',
    decline_type: 'hard',
    decline_code: 'expired_card',
    attempt_count: 2,
    recovery_status: 'recovered',
    klaviyo_flow_status: 'sent',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  }),
  normalizePaymentFailure({
    id: 'demo-3',
    stripe_event_id: 'evt_demo_3',
    customer_id: 'cus_demo_3',
    customer_email: 'vip@northwind.test',
    stripe_customer_id: 'cus_demo_3',
    amount_cents: 24000,
    currency: 'usd',
    status: 'retrying',
    decline_type: 'soft',
    decline_code: 'processing_error',
    attempt_count: 3,
    recovery_status: 'retrying',
    klaviyo_flow_status: 'queued',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  }),
];

export async function getPaymentFailures() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return getFallbackFailures();
  }

  const { data, error } = await supabase
    .from('payment_failures')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return getFallbackFailures();
  }

  return (data ?? []).map((record) => normalizePaymentFailure(record as Partial<PaymentFailureRecord>));
}

export async function createPaymentFailure(input: Partial<PaymentFailureRecord>) {
  const supabase = getSupabaseAdminClient();
  const amountCents = Number(input.amount_cents ?? input.amount ?? 0);

  const record = normalizePaymentFailure({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    customer_email: input.customer_email ?? 'unknown@example.com',
    stripe_customer_id: input.stripe_customer_id ?? input.customer_id ?? null,
    amount: amountCents,
    amount_cents: amountCents,
    currency: input.currency ?? 'usd',
    status: (input.status ?? 'pending') as PaymentStatus,
    decline_type: input.decline_type ?? 'soft',
    decline_code: input.decline_code ?? null,
    attempt_count: Number(input.attempt_count ?? 1),
    recovery_status: input.recovery_status ?? 'pending',
    klaviyo_flow_status: input.klaviyo_flow_status ?? 'not_sent',
    metadata: input.metadata ?? {},
    created_at: input.created_at ?? new Date().toISOString(),
    updated_at: input.updated_at ?? new Date().toISOString(),
  });

  if (!supabase) {
    return record;
  }

  const { amount: _legacyAmount, ...dbRecord } = record;

  const { data, error } = await supabase
    .from('payment_failures')
    .upsert({ ...dbRecord, id: record.id as string })
    .select()
    .single();

  if (error || !data) {
    return record;
  }

  return normalizePaymentFailure(data as Partial<PaymentFailureRecord>);
}

export async function updatePaymentFailureStatus(id: string, status: PaymentStatus, extra: Partial<PaymentFailureRecord> = {}) {
  const supabase = getSupabaseAdminClient();
  const update = {
    status,
    recovery_status: status,
    updated_at: new Date().toISOString(),
    ...extra,
  };

  if (!supabase) {
    return { id, ...update };
  }

  const { data, error } = await supabase
    .from('payment_failures')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return { id, ...update };
  }

  return normalizePaymentFailure(data as Partial<PaymentFailureRecord>);
}
