/**
 * Give-up sweep.
 *
 * After a final-notice email has been sent and DUNNING_GIVE_UP_HOURS have
 * elapsed without recovery, the backend gives up: it cancels the subscription
 * via the Stripe API (Klaviyo cannot do this) and fires the
 * `subscription_canceled` off-ramp event.
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { stripeClient } from '@/lib/stripe/client';
import { getDunningConfig, OFF_RAMP_EVENTS } from './constants';
import { enqueueOffRampSend, resolveCycle } from './engine';

export async function runGiveUpSweep() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { skipped: true, reason: 'supabase_not_configured' };

  const { giveUpHours } = getDunningConfig();
  const cutoff = new Date(Date.now() - giveUpHours * 3600_000).toISOString();

  const { data: cycles, error } = await supabase
    .from('dunning_cycles')
    .select(
      `
        id, subscription_id, customer_id, invoice_id,
        subscriptions (stripe_subscription_id),
        klaviyo_sends (klaviyo_event_name, status, sent_at)
      `,
    )
    .eq('status', 'active');

  if (error) return { error: error.message };

  let canceled = 0;

  for (const cycle of (cycles ?? []) as Record<string, any>[]) {
    const sends = Array.isArray(cycle.klaviyo_sends) ? cycle.klaviyo_sends : [];
    const finalNoticeSent = sends.find(
      (s: any) =>
        String(s.klaviyo_event_name ?? '').includes('final-notice') && s.status === 'sent',
    );
    if (!finalNoticeSent?.sent_at || finalNoticeSent.sent_at > cutoff) continue;

    const stripeSubscriptionId = cycle.subscriptions?.stripe_subscription_id;
    if (stripeClient && stripeSubscriptionId) {
      try {
        await stripeClient.subscriptions.cancel(stripeSubscriptionId);
      } catch (e) {
        console.error('⚠️ Stripe subscription cancel failed', {
          stripeSubscriptionId,
          error: e instanceof Error ? e.message : e,
        });
      }
    }

    const resolved = await resolveCycle(cycle.id, 'exhausted', 'exhausted');
    if (resolved) {
      await enqueueOffRampSend({
        customerId: cycle.customer_id,
        cycleId: cycle.id,
        eventName: OFF_RAMP_EVENTS.canceled,
      });
      canceled++;
    }
  }

  return { canceled };
}
