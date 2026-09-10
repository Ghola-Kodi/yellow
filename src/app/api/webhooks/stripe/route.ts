/**
 * Stripe webhook endpoint (dunning system).
 *
 * Responsibilities (spec Section 3):
 *   - verify the Stripe signature
 *   - dedupe redelivered events via webhook_receipts (stripe_event_id unique)
 *   - write to Supabase and enqueue Klaviyo sends
 *   - return a fast 2xx WITHOUT calling Klaviyo synchronously
 *   - dead-letter the event if the Supabase write fails (still 200 to Stripe)
 */

import Stripe from 'stripe';
import { getStripeWebhookSecret, stripeClient } from '@/lib/stripe/client';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processStripeEvent, SUPPORTED_EVENT_TYPES } from '@/lib/webhook/process-event';
import { deadLetterEvent } from '@/lib/webhook/dead-letter';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();
  const webhookSecret = getStripeWebhookSecret();
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  let event: Stripe.Event;

  // -- verify signature ------------------------------------------------------
  if (signature && webhookSecret && stripeClient) {
    try {
      event = stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error('⚠️ Webhook signature verification failed:', error instanceof Error ? error.message : error);
      return Response.json({ ok: false, error: 'Webhook signature verification failed' }, { status: 400 });
    }
  } else if (!isProduction) {
    // Unverified local fallback — manual/demo testing only.
    try {
      event = JSON.parse(rawBody || '{}') as Stripe.Event;
    } catch {
      return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!event?.type || !event?.data?.object) {
      return Response.json({ ok: false, error: 'Malformed webhook payload' }, { status: 400 });
    }
  } else {
    return Response.json({ ok: false, error: 'Webhook verification not configured' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const isSupported = SUPPORTED_EVENT_TYPES.has(event.type);

  // -- idempotency: record the receipt, bail on redelivery -------------------
  if (supabase) {
    const { error: receiptError } = await supabase.from('webhook_receipts').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      raw_payload: event as unknown as Record<string, unknown>,
      status: isSupported ? 'processed' : 'ignored',
    });
    if (receiptError && receiptError.code === '23505') {
      return Response.json({ ok: true, duplicate: true, type: event.type });
    }
  }

  if (!isSupported) {
    return Response.json({ ok: true, ignored: true, type: event.type });
  }

  // -- process (write only; no Klaviyo call here) ----------------------------
  try {
    const result = await processStripeEvent(
      event.type,
      (event.data.object as Record<string, any>) ?? {},
    );
    return Response.json({ ok: true, type: event.type, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Dunning processing failed for ${event.id}, dead-lettering`, message);

    if (supabase) {
      await supabase
        .from('webhook_receipts')
        .update({ status: 'failed', error: message })
        .eq('stripe_event_id', event.id);
    }
    await deadLetterEvent({
      stripeEventId: event.id,
      eventType: event.type,
      rawPayload: event,
      error: message,
    });

    // Still 200: Stripe did its part; we replay from the dead-letter queue.
    return Response.json({ ok: true, type: event.type, deadLettered: true });
  }
}
