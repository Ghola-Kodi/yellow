import { createPaymentFailure } from '@/lib/payment-store';
import { getStripeWebhookSecret, stripeClient } from '@/lib/stripe/client';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  if (!signature || !getStripeWebhookSecret()) {
    const payload = JSON.parse(rawBody || '{}');
    const customerEmail = payload?.data?.object?.customer_email ?? 'unknown@example.com';
    const amount = Number(payload?.data?.object?.amount_due ?? 0);
    const failure = await createPaymentFailure({
      id: payload?.id ?? `evt_${Date.now()}`,
      stripe_event_id: payload?.id ?? null,
      customer_email: customerEmail,
      stripe_customer_id: payload?.data?.object?.customer ?? null,
      amount_cents: amount,
      amount,
      currency: payload?.data?.object?.currency ?? 'usd',
      status: 'pending',
      decline_type: 'soft',
      decline_code: payload?.data?.object?.last_payment_error?.code ?? 'generic_decline',
      attempt_count: Number(payload?.data?.object?.attempt_count ?? 1),
      recovery_status: 'pending',
      klaviyo_flow_status: 'queued',
      metadata: { source: 'stripe-webhook', eventType: payload?.type ?? 'invoice.payment_failed' },
    });

    return Response.json({ ok: true, failure });
  }

  if (!stripeClient) {
    return Response.json({ ok: false, error: 'Stripe client not configured' }, { status: 500 });
  }

  try {
    const event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );

    if (event.type !== 'invoice.payment_failed' && event.type !== 'payment_intent.payment_failed') {
      return Response.json({ ok: true, ignored: true, type: event.type });
    }

    const invoice = event.data.object as any;
    const customerEmail = invoice.customer_email ?? 'unknown@example.com';
    const amount = Number(invoice.amount_due ?? invoice.amount ?? 0);

    const declineCode = invoice.last_payment_error?.code ?? 'generic_decline';

    const failure = await createPaymentFailure({
      id: String(event.id ?? `evt_${Date.now()}`),
      stripe_event_id: String(event.id ?? null),
      customer_email: customerEmail,
      stripe_customer_id: invoice.customer ?? invoice.customer_id ?? null,
      amount_cents: amount,
      amount,
      currency: invoice.currency ?? 'usd',
      status: 'pending',
      decline_type: invoice.last_payment_error?.code ? 'hard' : 'soft',
      decline_code: declineCode,
      attempt_count: Number(invoice.attempt_count ?? 1),
      recovery_status: 'pending',
      klaviyo_flow_status: 'queued',
      metadata: {
        source: 'stripe-webhook',
        eventType: event.type,
        declineCode,
      },
    });

    return Response.json({ ok: true, failure });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Webhook verification failed' }, { status: 400 });
  }
}
