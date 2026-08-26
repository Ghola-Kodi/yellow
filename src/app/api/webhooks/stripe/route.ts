import { createPaymentFailure } from '@/lib/payment-store';
import { getStripeWebhookSecret, stripeClient } from '@/lib/stripe/client';
import { triggerDunningEmail } from '@/lib/klaviyo/client';

function extractFailureFields(event: { type: string; data: { object: any } }) {
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

async function storeAndNotify(eventId: string, eventType: string, fields: ReturnType<typeof extractFailureFields>) {
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

  // Unverified fallback path — only for local/manual testing without a
  // real Stripe webhook secret configured. Never trust this in production;
  // there is no proof the payload actually came from Stripe.
  if (!signature || !getStripeWebhookSecret()) {
    const payload = JSON.parse(rawBody || '{}');
    const fields = extractFailureFields({
      type: payload?.type ?? 'invoice.payment_failed',
      data: { object: payload?.data?.object ?? {} },
    });
    const { failure, klaviyoResult } = await storeAndNotify(
      payload?.id ?? `evt_${Date.now()}`,
      payload?.type ?? 'invoice.payment_failed',
      fields,
    );
    return Response.json({ ok: true, verified: false, failure, klaviyo: klaviyoResult });
  }

  if (!stripeClient) {
    return Response.json({ ok: false, error: 'Stripe client not configured' }, { status: 500 });
  }

  try {
    const event = stripeClient.webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());

    if (event.type !== 'invoice.payment_failed' && event.type !== 'payment_intent.payment_failed') {
      return Response.json({ ok: true, ignored: true, type: event.type });
    }

    const fields = extractFailureFields(event as any);
    const { failure, klaviyoResult } = await storeAndNotify(String(event.id), event.type, fields);

    return Response.json({ ok: true, verified: true, failure, klaviyo: klaviyoResult });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Webhook verification failed' },
      { status: 400 },
    );
  }
}
