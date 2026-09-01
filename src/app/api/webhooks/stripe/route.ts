import Stripe from 'stripe';
import { createPaymentFailure } from '@/lib/payment-store';
import { getStripeWebhookSecret, stripeClient } from '@/lib/stripe/client';
import { triggerDunningEmail } from '@/lib/klaviyo/client';

type SupportedEventType = 'invoice.payment_failed' | 'payment_intent.payment_failed';

const SUPPORTED_EVENT_TYPES = new Set<SupportedEventType>([
  'invoice.payment_failed',
  'payment_intent.payment_failed',
]);

const HARD_DECLINE_CODES = new Set([
  'expired_card',
  'incorrect_cvc',
  'incorrect_number',
  'lost_card',
  'stolen_card',
  'fraudulent',
  'card_not_supported',
  'invalid_account',
]);

interface FailureFields {
  customerEmail: string;
  stripeCustomerId: string | null;
  amount: number;
  currency: string;
  declineCode: string;
  attemptCount: number;
}

interface MinimalStripeEvent {
  type: string;
  data: { object: Record<string, any> };
}

function extractFailureFields(event: MinimalStripeEvent): FailureFields {
  const object = event.data.object;

  // payment_intent.payment_failed shape (used by the simulator)
  if (event.type === 'payment_intent.payment_failed') {
    const lastError = object.last_payment_error;
    return {
      customerEmail: object.receipt_email ?? object.metadata?.customer_email ?? 'unknown@example.com',
      stripeCustomerId: object.customer ?? null,
      amount: Number(object.amount ?? 0),
      currency: object.currency ?? 'usd',
      declineCode: lastError?.decline_code ?? lastError?.code ?? 'generic_decline',
      attemptCount: 1,
    };
  }

  // invoice.payment_failed shape (used by real Stripe subscriptions)
  return {
    customerEmail: object.customer_email ?? object.metadata?.customer_email ?? 'unknown@example.com',
    stripeCustomerId: object.customer ?? null,
    amount: Number(object.amount_due ?? object.amount ?? 0),
    currency: object.currency ?? 'usd',
    declineCode: object.last_payment_error?.code ?? 'generic_decline',
    attemptCount: Number(object.attempt_count ?? 1),
  };
}

async function storeAndNotify(eventId: string, eventType: string, fields: FailureFields) {
  const declineType = HARD_DECLINE_CODES.has(fields.declineCode) ? 'hard' : 'soft';

  const failure = await createPaymentFailure({
    id: eventId,
    stripe_event_id: eventId,
    customer_email: fields.customerEmail,
    stripe_customer_id: fields.stripeCustomerId,
    amount_cents: fields.amount,
    amount: fields.amount,
    currency: fields.currency,
    status: 'pending',
    decline_code: fields.declineCode,
    decline_type: declineType,
    attempt_count: fields.attemptCount,
    recovery_status: 'pending',
    klaviyo_flow_status: 'queued',
    metadata: { source: 'stripe-webhook', eventType, declineCode: fields.declineCode },
  });

  const klaviyoResult = await triggerDunningEmail({
    email: fields.customerEmail,
    declineType,
    amountCents: fields.amount,
    currency: fields.currency,
  });

  return { failure, klaviyoResult };
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();
  const webhookSecret = getStripeWebhookSecret();
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  // Unverified fallback path — only for local/manual testing without a
  // real Stripe webhook secret configured. There is no proof an unverified
  // payload actually came from Stripe, so this path is refused outright in
  // production rather than silently accepting arbitrary POST bodies.
  if (!signature || !webhookSecret) {
    if (isProduction) {
      console.error('⚠️ Rejected unverified webhook request in production — missing signature or webhook secret');
      return Response.json({ ok: false, error: 'Webhook verification not configured' }, { status: 400 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody || '{}');
    } catch {
      return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const eventType = payload?.type ?? 'invoice.payment_failed';
    const fields = extractFailureFields({
      type: eventType,
      data: { object: payload?.data?.object ?? {} },
    });
    const { failure, klaviyoResult } = await storeAndNotify(
      payload?.id ?? `evt_${Date.now()}`,
      eventType,
      fields,
    );
    return Response.json({ ok: true, verified: false, failure, klaviyo: klaviyoResult });
  }

  if (!stripeClient) {
    return Response.json({ ok: false, error: 'Stripe client not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('⚠️ Webhook signature verification failed:', error instanceof Error ? error.message : error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Webhook verification failed' },
      { status: 400 },
    );
  }

  if (!SUPPORTED_EVENT_TYPES.has(event.type as SupportedEventType)) {
    return Response.json({ ok: true, ignored: true, type: event.type });
  }

  try {
    const fields = extractFailureFields(event as unknown as MinimalStripeEvent);
    const { failure, klaviyoResult } = await storeAndNotify(event.id, event.type, fields);
    return Response.json({ ok: true, verified: true, failure, klaviyo: klaviyoResult });
  } catch (error) {
    console.error('⚠️ Error processing payment failure event:', error instanceof Error ? error.message : error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to process event' },
      { status: 500 },
    );
  }
}
