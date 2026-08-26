import { stripeClient } from '@/lib/stripe/client';
import { checkSimulatorRateLimit, getClientIp } from '@/lib/rate-limit';

// Stripe's built-in test payment methods that always fail with a specific
// decline code, in test mode, with no card entry needed.
// https://docs.stripe.com/testing#declined-payments
const DECLINE_TEST_PAYMENT_METHODS: Record<'soft' | 'hard', string> = {
  soft: 'pm_card_chargeDeclinedInsufficientFunds',
  hard: 'pm_card_chargeDeclinedExpiredCard',
};

export async function POST(request: Request) {
  if (!stripeClient) {
    return Response.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
      { status: 500 },
    );
  }

  const payload = await request.json().catch(() => ({}));
  const { email, amount, declineType } = payload as {
    email?: string;
    amount?: number;
    declineType?: 'soft' | 'hard';
  };

  if (!email || !amount) {
    return Response.json({ error: 'email and amount are required' }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  const rateLimit = await checkSimulatorRateLimit(clientIp, email);

  if (!rateLimit.allowed) {
    return Response.json({ error: rateLimit.reason }, { status: 429 });
  }

  const type = declineType === 'hard' ? 'hard' : 'soft';
  const paymentMethod = DECLINE_TEST_PAYMENT_METHODS[type];
  const amountCents = Math.round(Number(amount));

  try {
    // This is a real Stripe API call. In test mode, this payment method
    // guarantees a genuine decline, which Stripe reports back both
    // synchronously (caught below) and asynchronously via a real,
    // signed webhook event to /api/webhooks/stripe.
    await stripeClient.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method: paymentMethod,
      confirm: true,
      receipt_email: email,
      metadata: {
        source: 'simulator',
        customer_email: email,
        decline_type: type,
      },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });

    // Stripe test decline payment methods always throw — if we get here,
    // something about the test method or account config changed.
    return Response.json(
      { ok: false, error: 'Expected a decline but the charge succeeded' },
      { status: 500 },
    );
  } catch (error: any) {
    const isCardError = error?.type === 'StripeCardError';

    if (!isCardError) {
      return Response.json(
        { ok: false, error: error?.message ?? 'Failed to create test payment' },
        { status: 500 },
      );
    }

    // Expected path: Stripe declined it for real. The webhook (with a
    // verified signature) will land shortly after and is what actually
    // writes to Supabase and triggers Klaviyo — this response is just
    // confirmation that a real failure was created.
    return Response.json({
      ok: true,
      message: 'Real Stripe test decline triggered. Waiting for webhook to confirm.',
      payment_intent: error?.raw?.payment_intent?.id ?? null,
      decline_code: error?.raw?.decline_code ?? error?.decline_code ?? null,
    });
  }
}
