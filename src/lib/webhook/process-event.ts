/**
 * Shared event dispatcher — used by both the live webhook route and the
 * dead-letter replay path, so replay runs the exact same logic as the first
 * delivery (no drift between the two code paths).
 */

import {
  parseInvoicePaymentFailed,
  parseInvoicePaymentSucceeded,
  parseSubscriptionUpdated,
  parseSubscriptionDeleted,
  parseCustomerUpdated,
} from '@/lib/dunning/parse-stripe';
import {
  onInvoicePaymentFailed,
  onInvoicePaymentSucceeded,
  onSubscriptionUpdated,
  onSubscriptionDeleted,
  onCustomerUpdated,
} from '@/lib/dunning/engine';

export const SUPPORTED_EVENT_TYPES = new Set([
  'invoice.payment_failed',
  'invoice.payment_succeeded',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.updated',
]);

/** Throws on Supabase failure so the caller can dead-letter the event. */
export async function processStripeEvent(
  eventType: string,
  object: Record<string, any>,
): Promise<Record<string, any>> {
  switch (eventType) {
    case 'invoice.payment_failed':
      return onInvoicePaymentFailed(parseInvoicePaymentFailed(object));
    case 'invoice.payment_succeeded':
      return onInvoicePaymentSucceeded(parseInvoicePaymentSucceeded(object));
    case 'customer.subscription.updated':
      return onSubscriptionUpdated(parseSubscriptionUpdated(object));
    case 'customer.subscription.deleted':
      return onSubscriptionDeleted(parseSubscriptionDeleted(object));
    case 'customer.updated':
      return onCustomerUpdated(parseCustomerUpdated(object));
    default:
      return { handled: false, reason: 'unsupported_event' };
  }
}
