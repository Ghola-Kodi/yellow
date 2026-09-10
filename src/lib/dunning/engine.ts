/**
 * Dunning engine — the durable orchestration layer.
 *
 * These functions mutate Supabase only. They never call Klaviyo or Stripe
 * directly: the webhook handler enqueues pending sends and the async worker
 * performs the outbound calls. Every state change is traceable to a row.
 *
 * Functions throw on Supabase failure so the caller (the webhook route) can
 * route the event to the dead-letter queue instead of silently dropping it.
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CustomerRow,
  SubscriptionRow,
  DunningCycleRow,
  DunningAttemptRow,
  KlaviyoSendRow,
  SubscriptionStatus,
  ResolutionType,
} from '@/types/dunning';
import { classifyDecline, type DeclineCategory } from './decline-classification';
import { DUNNING_EVENT_NAMES, OFF_RAMP_EVENTS, getDunningConfig } from './constants';
import type {
  FailedInvoicePayload,
  SucceededInvoicePayload,
  SubscriptionUpdatedPayload,
  SubscriptionDeletedPayload,
  CustomerUpdatedPayload,
} from './parse-stripe';

function requireClient(): SupabaseClient {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase admin client is not configured');
  }
  return supabase;
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export async function upsertCustomer(
  stripeCustomerId: string,
  email: string,
): Promise<CustomerRow> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('customers')
    .upsert({ stripe_customer_id: stripeCustomerId, email }, { onConflict: 'stripe_customer_id' })
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to upsert customer: ${error?.message ?? 'no data'}`);
  }
  return data as CustomerRow;
}

export async function upsertSubscription(
  customerId: string,
  stripeSubscriptionId: string,
  status: SubscriptionStatus,
): Promise<SubscriptionRow> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(
      { customer_id: customerId, stripe_subscription_id: stripeSubscriptionId, status },
      { onConflict: 'stripe_subscription_id' },
    )
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to upsert subscription: ${error?.message ?? 'no data'}`);
  }
  return data as SubscriptionRow;
}

export async function openOrGetCycle(params: {
  subscriptionId: string;
  customerId: string;
  invoiceId: string;
  amountDue: number;
  amountRemaining: number;
  stripeRetryCount: number;
}): Promise<{ cycle: DunningCycleRow; created: boolean }> {
  const supabase = requireClient();

  const { data: existing, error: existingError } = await supabase
    .from('dunning_cycles')
    .select('*')
    .eq('invoice_id', params.invoiceId)
    .maybeSingle();
  if (existingError) {
    throw new Error(`Failed to look up cycle: ${existingError.message}`);
  }
  if (existing) {
    // Refresh the retry count even on a redelivered event.
    await supabase
      .from('dunning_cycles')
      .update({
        stripe_retry_count: params.stripeRetryCount,
        amount_remaining: params.amountRemaining,
      })
      .eq('id', existing.id);
    return { cycle: { ...existing, stripe_retry_count: params.stripeRetryCount } as DunningCycleRow, created: false };
  }

  const { data, error } = await supabase
    .from('dunning_cycles')
    .insert({
      subscription_id: params.subscriptionId,
      customer_id: params.customerId,
      invoice_id: params.invoiceId,
      status: 'active',
      stripe_retry_count: params.stripeRetryCount,
      amount_due: params.amountDue,
      amount_remaining: params.amountRemaining,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to create cycle: ${error?.message ?? 'no data'}`);
  }
  return { cycle: data as DunningCycleRow, created: true };
}

export async function addAttempt(params: {
  cycleId: string;
  declineCode: string;
  category: DeclineCategory;
  attemptNumber: number;
  amountDue: number;
}): Promise<DunningAttemptRow> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('dunning_attempts')
    .insert({
      dunning_cycle_id: params.cycleId,
      stripe_decline_code: params.declineCode,
      decline_category: params.category,
      attempt_number: params.attemptNumber,
      amount_due: params.amountDue,
    })
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to add attempt: ${error?.message ?? 'no data'}`);
  }
  return data as DunningAttemptRow;
}

export async function enqueueAttemptSend(params: {
  customerId: string;
  cycleId: string;
  attemptId: string;
  category: DeclineCategory;
}): Promise<KlaviyoSendRow> {
  const supabase = requireClient();
  const eventName = DUNNING_EVENT_NAMES[params.category];
  const { data, error } = await supabase
    .from('klaviyo_sends')
    .upsert(
      {
        customer_id: params.customerId,
        dunning_cycle_id: params.cycleId,
        dunning_attempt_id: params.attemptId,
        klaviyo_event_name: eventName,
        status: 'pending',
      },
      { onConflict: 'dunning_attempt_id,klaviyo_event_name' },
    )
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to enqueue send: ${error?.message ?? 'no data'}`);
  }
  return data as KlaviyoSendRow;
}

export async function enqueueOffRampSend(params: {
  customerId: string;
  cycleId: string;
  eventName: string;
}): Promise<KlaviyoSendRow | null> {
  const supabase = requireClient();

  const { data: existing } = await supabase
    .from('klaviyo_sends')
    .select('id, status')
    .eq('dunning_cycle_id', params.cycleId)
    .eq('klaviyo_event_name', params.eventName)
    .is('dunning_attempt_id', null)
    .maybeSingle();
  if (existing) return existing as KlaviyoSendRow;

  const { data, error } = await supabase
    .from('klaviyo_sends')
    .insert({
      customer_id: params.customerId,
      dunning_cycle_id: params.cycleId,
      dunning_attempt_id: null,
      klaviyo_event_name: params.eventName,
      status: 'pending',
    })
    .select()
    .single();
  if (error) {
    // Unique-violation backstop (partial unique index) — treat as already queued.
    if (error.code === '23505') return null;
    throw new Error(`Failed to enqueue off-ramp send: ${error.message}`);
  }
  return data as KlaviyoSendRow;
}

export async function resolveCycle(
  cycleId: string,
  status: 'recovered' | 'exhausted',
  resolutionType: ResolutionType,
): Promise<DunningCycleRow | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('dunning_cycles')
    .update({
      status,
      resolution_type: resolutionType,
      resolved_at: new Date().toISOString(),
      ...(status === 'recovered' ? { amount_remaining: 0 } : {}),
    })
    .eq('id', cycleId)
    .eq('status', 'active')
    .select()
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to resolve cycle: ${error.message}`);
  }
  return (data as DunningCycleRow | null) ?? null;
}

export async function getActiveCyclesForSubscription(
  subscriptionId: string,
): Promise<DunningCycleRow[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from('dunning_cycles')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'active');
  if (error) {
    throw new Error(`Failed to fetch active cycles: ${error.message}`);
  }
  return (data ?? []) as DunningCycleRow[];
}

// ---------------------------------------------------------------------------
// Composite event handlers (called from the webhook route)
// ---------------------------------------------------------------------------

export async function onInvoicePaymentFailed(payload: FailedInvoicePayload) {
  const config = getDunningConfig();

  // We can't dunn an anonymous invoice without a customer or subscription.
  if (!payload.stripeCustomerId) {
    return { handled: false, reason: 'missing_customer' } as const;
  }
  if (!payload.stripeSubscriptionId) {
    return { handled: false, reason: 'missing_subscription' } as const;
  }
  // Trial customers get a pass until they convert.
  if (payload.subscriptionStatus === 'trialing') {
    return { handled: false, reason: 'trialing' } as const;
  }

  const email = payload.customerEmail ?? 'unknown@example.com';
  const customer = await upsertCustomer(payload.stripeCustomerId, email);
  const subscription = await upsertSubscription(
    customer.id,
    payload.stripeSubscriptionId,
    payload.subscriptionStatus ?? 'past_due',
  );

  const { cycle } = await openOrGetCycle({
    subscriptionId: subscription.id,
    customerId: customer.id,
    invoiceId: payload.invoiceId,
    amountDue: payload.amountDue,
    amountRemaining: payload.amountRemaining,
    stripeRetryCount: payload.attemptCount,
  });

  if (cycle.status !== 'active') {
    return { handled: false, reason: 'cycle_not_active', cycleId: cycle.id } as const;
  }

  const classification = classifyDecline(payload.declineCode);
  const attempt = await addAttempt({
    cycleId: cycle.id,
    declineCode: payload.declineCode,
    category: classification.category,
    attemptNumber: payload.attemptCount,
    amountDue: payload.amountDue,
  });

  // Respect Stripe's own retry schedule: don't email until Stripe has made
  // startAfterAttempt tries (or the customer has a hard/auth decline, which
  // Stripe will not fix by retrying).
  const isHardOrAuth =
    classification.category === 'hard_update_required' ||
    classification.category === 'auth_required';

  const shouldSend =
    payload.attemptCount >= config.startAfterAttempt || isHardOrAuth;

  let send: KlaviyoSendRow | null = null;
  if (shouldSend) {
    const sendCategory: DeclineCategory =
      payload.attemptCount >= config.maxAttempts ? 'final_notice' : classification.category;
    send = await enqueueAttemptSend({
      customerId: customer.id,
      cycleId: cycle.id,
      attemptId: attempt.id,
      category: sendCategory,
    });
  }

  return {
    handled: true,
    cycleId: cycle.id,
    attemptId: attempt.id,
    declineCategory: classification.category,
    sendQueued: Boolean(send),
    eventName: send?.klaviyo_event_name ?? null,
  };
}

export async function onInvoicePaymentSucceeded(payload: SucceededInvoicePayload) {
  const supabase = requireClient();

  // 1) The exact invoice that was in dunning got paid.
  const { data: cycleByInvoice } = await supabase
    .from('dunning_cycles')
    .select('*')
    .eq('invoice_id', payload.invoiceId)
    .maybeSingle();
  if (cycleByInvoice && (cycleByInvoice as DunningCycleRow).status === 'active') {
    const cycle = cycleByInvoice as DunningCycleRow;
    const resolved = await resolveCycle(cycle.id, 'recovered', 'original_invoice_paid');
    if (resolved) {
      await enqueueOffRampSend({
        customerId: cycle.customer_id,
        cycleId: cycle.id,
        eventName: OFF_RAMP_EVENTS.recovered,
      });
    }
    return { handled: true, resolutionType: 'original_invoice_paid', cycleId: cycle.id };
  }

  // 2) A different (new) invoice succeeded while a cycle is still active —
  //    the customer updated their card and Stripe billed a new invoice.
  if (payload.stripeSubscriptionId) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', payload.stripeSubscriptionId)
      .maybeSingle();
    if (sub) {
      const activeCycles = await getActiveCyclesForSubscription((sub as SubscriptionRow).id);
      for (const cycle of activeCycles) {
        const resolved = await resolveCycle(cycle.id, 'recovered', 'card_updated_new_invoice');
        if (resolved) {
          await enqueueOffRampSend({
            customerId: cycle.customer_id,
            cycleId: cycle.id,
            eventName: OFF_RAMP_EVENTS.recovered,
          });
        }
      }
      if (activeCycles.length > 0) {
        return {
          handled: true,
          resolutionType: 'card_updated_new_invoice',
          cycleIds: activeCycles.map((c) => c.id),
        };
      }
    }
  }

  return { handled: false, reason: 'no_active_cycle' };
}

export async function onSubscriptionUpdated(payload: SubscriptionUpdatedPayload) {
  if (payload.stripeCustomerId) {
    const customer = await upsertCustomer(payload.stripeCustomerId, 'unknown@example.com');
    const subscription = await upsertSubscription(
      customer.id,
      payload.stripeSubscriptionId,
      payload.status,
    );
    if (payload.status === 'canceled') {
      await cancelActiveCycles(subscription.id);
    }
    return { handled: true, subscriptionId: subscription.id, status: payload.status };
  }
  return { handled: false, reason: 'missing_customer' };
}

export async function onSubscriptionDeleted(payload: SubscriptionDeletedPayload) {
  if (payload.stripeCustomerId) {
    const customer = await upsertCustomer(payload.stripeCustomerId, 'unknown@example.com');
    const subscription = await upsertSubscription(
      customer.id,
      payload.stripeSubscriptionId,
      'canceled',
    );
    await cancelActiveCycles(subscription.id);
    return { handled: true, subscriptionId: subscription.id };
  }
  return { handled: false, reason: 'missing_customer' };
}

async function cancelActiveCycles(subscriptionId: string) {
  const activeCycles = await getActiveCyclesForSubscription(subscriptionId);
  for (const cycle of activeCycles) {
    const resolved = await resolveCycle(cycle.id, 'exhausted', 'canceled');
    if (resolved) {
      await enqueueOffRampSend({
        customerId: cycle.customer_id,
        cycleId: cycle.id,
        eventName: OFF_RAMP_EVENTS.canceled,
      });
    }
  }
}

export async function onCustomerUpdated(payload: CustomerUpdatedPayload) {
  if (payload.email) {
    const customer = await upsertCustomer(payload.stripeCustomerId, payload.email);
    return { handled: true, customerId: customer.id };
  }
  return { handled: false, reason: 'missing_email' };
}
