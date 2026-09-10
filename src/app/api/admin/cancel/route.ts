import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { stripeClient } from '@/lib/stripe/client';
import { resolveCycle, enqueueOffRampSend } from '@/lib/dunning/engine';
import { OFF_RAMP_EVENTS } from '@/lib/dunning/constants';

export const runtime = 'nodejs';

/**
 * Admin action: manually cancel an active dunning cycle.
 * Cancels the subscription in Stripe (the main app owns entitlements, so a
 * real deployment would also call the main app's access-revocation function),
 * resolves the cycle, and queues the `subscription_canceled` off-ramp email.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const cycleId = typeof body?.cycleId === 'string' ? body.cycleId : null;
  if (!cycleId) {
    return Response.json({ ok: false, error: 'cycleId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: cycle } = await supabase
    .from('dunning_cycles')
    .select('id, customer_id, status, subscriptions (stripe_subscription_id)')
    .eq('id', cycleId)
    .maybeSingle();

  if (!cycle || (cycle as any).status !== 'active') {
    return Response.json({ ok: false, error: 'Cycle not found or not active' }, { status: 404 });
  }

  const stripeSubscriptionId = (cycle as any).subscriptions?.stripe_subscription_id;
  if (stripeClient && stripeSubscriptionId) {
    try {
      await stripeClient.subscriptions.cancel(stripeSubscriptionId);
    } catch (e) {
      console.error('⚠️ Admin cancel: Stripe cancel failed', {
        stripeSubscriptionId,
        error: e instanceof Error ? e.message : e,
      });
    }
  }

  const resolved = await resolveCycle(cycleId, 'exhausted', 'canceled');
  if (resolved) {
    await enqueueOffRampSend({
      customerId: (cycle as any).customer_id,
      cycleId,
      eventName: OFF_RAMP_EVENTS.canceled,
    });
  }

  return Response.json({ ok: true, cycleId, resolved: Boolean(resolved) });
}
