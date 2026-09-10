import { createPaymentFailure } from '@/lib/payment-store';
import { triggerDunningEmail } from '@/lib/klaviyo/client';

export type SupportedEventType = 'invoice.payment_failed' | 'payment_intent.payment_failed';

export const SUPPORTED_EVENT_TYPES = new Set<SupportedEventType>([
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

export interface FailureFields {
  customerEmail: string;
  stripeCustomerId: string | null;
  amount: number;
  currency: string;
  declineCode: string;
  attemptCount: number;
}

export interface MinimalStripeEvent {
  type: string;
  data: { object: Record<string, any> };
}

export function extractFailureFields(event: MinimalStripeEvent): FailureFields {
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

export function classifyDecline(declineCode: string): 'soft' | 'hard' {
  return HARD_DECLINE_CODES.has(declineCode) ? 'hard' : 'soft';
}

/**
 * Single source of truth for "a payment failed": writes the record and
 * fires the Klaviyo dunning event. `eventId` should be stable per real-world
 * occurrence (a Stripe event id, or a Stripe PaymentIntent id) so that
 * calling this twice for the same failure — e.g. once synchronously from
 * the simulator route and once from the async webhook — upserts the same
 * row and does not double-send to Klaviyo. Callers that already know a
 * failure was handled synchronously should skip calling this again for the
 * same underlying Stripe object (see the simulator-source check in the
 * webhook route).
 */
export async function storeAndNotify(eventId: string, eventType: string, fields: FailureFields) {
  const declineType = classifyDecline(fields.declineCode);

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
    uniqueId: eventId,
  });

  return { failure, klaviyoResult, declineType };
}
