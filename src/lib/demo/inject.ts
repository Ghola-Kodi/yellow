/**
 * Demo injection — synthesizes a realistic `invoice.payment_failed` Stripe
 * event and runs it through the exact same processing path as a real webhook,
 * so a one-click demo exercises: receipt → idempotency → classification →
 * cycle/attempt → Klaviyo send enqueue.
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processStripeEvent } from '@/lib/webhook/process-event';

export interface InjectedFailure {
  eventId: string;
  invoiceId: string;
  email: string;
  declineCode: string;
  cycleId?: string;
  sendQueued?: boolean;
  eventName?: string | null;
}

export async function injectFailure(params: {
  email: string;
  declineCode: string;
  amountCents?: number;
  attemptCount?: number;
}): Promise<InjectedFailure> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase not configured');

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const eventId = `evt_demo_${suffix}`;
  const invoiceId = `in_demo_${suffix}`;
  const subscriptionId = `sub_demo_${Math.random().toString(36).slice(2, 12)}`;
  const customerId = `cus_demo_${Math.random().toString(36).slice(2, 12)}`;
  const amountCents = params.amountCents ?? 4900;
  const attemptCount = params.attemptCount ?? 2;

  const object = {
    id: invoiceId,
    object: 'invoice',
    customer: customerId,
    customer_email: params.email,
    subscription: subscriptionId,
    amount_due: amountCents,
    amount_remaining: amountCents,
    attempt_count: attemptCount,
    last_payment_error: {
      decline_code: params.declineCode,
      message: `${params.declineCode} (demo)`,
    },
    status: 'open',
  };

  // Mirror the webhook receipt write so the event appears in the live feed.
  await supabase.from('webhook_receipts').insert({
    stripe_event_id: eventId,
    event_type: 'invoice.payment_failed',
    raw_payload: { id: eventId, type: 'invoice.payment_failed', data: { object } },
  });

  const result = (await processStripeEvent('invoice.payment_failed', object)) as any;

  return {
    eventId,
    invoiceId,
    email: params.email,
    declineCode: params.declineCode,
    cycleId: result.cycleId,
    sendQueued: result.sendQueued,
    eventName: result.eventName,
  };
}
