/**
 * Dead-letter queue.
 *
 * If a Supabase write fails while handling a webhook, the raw event lands here
 * (or in the server log as a last resort) so it can be replayed. The webhook
 * still returns 200 to Stripe — Stripe did its job; we replay from here.
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processStripeEvent } from './process-event';

export async function deadLetterEvent(params: {
  stripeEventId: string | null;
  eventType: string;
  rawPayload: unknown;
  error: string;
}): Promise<{ persisted: boolean }> {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase.from('dead_letter_events').insert({
      stripe_event_id: params.stripeEventId,
      event_type: params.eventType,
      raw_payload: params.rawPayload,
      error: params.error,
    });
    if (!error) return { persisted: true };
  }
  // Last-resort fallback: at least make it visible in the server logs.
  console.error('[dead-letter] event could not be persisted', {
    stripe_event_id: params.stripeEventId,
    event_type: params.eventType,
    error: params.error,
  });
  return { persisted: false };
}

export async function replayDeadLetters(limit = 20) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { skipped: true, reason: 'supabase_not_configured' };

  const { data, error } = await supabase
    .from('dead_letter_events')
    .select('*')
    .lt('replay_attempts', 5)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return { error: error.message };

  let replayed = 0;
  let failed = 0;

  for (const row of data ?? []) {
    const payload = row.raw_payload as Record<string, any>;
    const nextAttempts = (row.replay_attempts ?? 0) + 1;
    try {
      await processStripeEvent(row.event_type, payload?.data?.object ?? {});
      await supabase
        .from('dead_letter_events')
        .update({ replayed_at: new Date().toISOString(), replay_attempts: nextAttempts })
        .eq('id', row.id);
      replayed++;
    } catch (e) {
      await supabase
        .from('dead_letter_events')
        .update({ replay_attempts: nextAttempts })
        .eq('id', row.id);
      failed++;
    }
  }

  return { replayed, failed };
}
