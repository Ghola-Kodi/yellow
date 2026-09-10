/**
 * Stripe event -> normalized dunning payload parsers.
 *
 * The webhook route verifies the signature; these functions extract only the
 * fields the engine needs, defensively (Stripe's shape varies a little between
 * invoice and payment_intent events). Stripe remains source of truth — we only
 * read, never mutate, its objects here.
 */

import type { SubscriptionStatus } from '@/types/dunning';

export interface FailedInvoicePayload {
  invoiceId: string;
  stripeCustomerId: string | null;
  customerEmail: string | null;
  stripeSubscriptionId: string | null;
  amountDue: number; // cents
  amountRemaining: number; // cents
  attemptCount: number;
  declineCode: string;
  subscriptionStatus: SubscriptionStatus | null;
}

export interface SucceededInvoicePayload {
  invoiceId: string;
  stripeCustomerId: string | null;
  customerEmail: string | null;
  stripeSubscriptionId: string | null;
  amountPaid: number;
}

export interface SubscriptionUpdatedPayload {
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  status: SubscriptionStatus;
}

export interface SubscriptionDeletedPayload {
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
}

export interface CustomerUpdatedPayload {
  stripeCustomerId: string;
  email: string | null;
}

type AnyRecord = Record<string, any>;

/** Pull a decline code from the several places Stripe may stash it. */
function extractDeclineCode(object: AnyRecord): string {
  const lastPaymentError = object.last_payment_error as AnyRecord | null | undefined;
  const paymentIntent = object.payment_intent as AnyRecord | string | null | undefined;
  const charge = object.charge as AnyRecord | string | null | undefined;

  return (
    lastPaymentError?.decline_code ||
    lastPaymentError?.code ||
    (typeof paymentIntent === 'object' && paymentIntent?.last_payment_error?.decline_code) ||
    (typeof charge === 'object' && charge?.failure_code) ||
    'generic_decline'
  );
}

export function parseInvoicePaymentFailed(object: AnyRecord): FailedInvoicePayload {
  const subscriptionId =
    (typeof object.subscription === 'string' ? object.subscription : object.subscription?.id) ??
    object.parent?.subscription ??
    null;

  return {
    invoiceId: String(object.id ?? ''),
    stripeCustomerId:
      (typeof object.customer === 'string' ? object.customer : object.customer?.id) ?? null,
    customerEmail: object.customer_email ?? object.customer?.email ?? null,
    stripeSubscriptionId: subscriptionId,
    amountDue: Number(object.amount_due ?? object.amount ?? 0),
    amountRemaining: Number(object.amount_remaining ?? object.amount_due ?? object.amount ?? 0),
    attemptCount: Number(object.attempt_count ?? 1),
    declineCode: extractDeclineCode(object),
    subscriptionStatus: (object.subscription_status as SubscriptionStatus) ?? null,
  };
}

export function parseInvoicePaymentSucceeded(object: AnyRecord): SucceededInvoicePayload {
  const subscriptionId =
    (typeof object.subscription === 'string' ? object.subscription : object.subscription?.id) ?? null;

  return {
    invoiceId: String(object.id ?? ''),
    stripeCustomerId:
      (typeof object.customer === 'string' ? object.customer : object.customer?.id) ?? null,
    customerEmail: object.customer_email ?? object.customer?.email ?? null,
    stripeSubscriptionId: subscriptionId,
    amountPaid: Number(object.amount_paid ?? 0),
  };
}

export function parseSubscriptionUpdated(object: AnyRecord): SubscriptionUpdatedPayload {
  return {
    stripeSubscriptionId: String(object.id ?? ''),
    stripeCustomerId:
      (typeof object.customer === 'string' ? object.customer : object.customer?.id) ?? null,
    status: (object.status as SubscriptionStatus) ?? 'active',
  };
}

export function parseSubscriptionDeleted(object: AnyRecord): SubscriptionDeletedPayload {
  return {
    stripeSubscriptionId: String(object.id ?? ''),
    stripeCustomerId:
      (typeof object.customer === 'string' ? object.customer : object.customer?.id) ?? null,
  };
}

export function parseCustomerUpdated(object: AnyRecord): CustomerUpdatedPayload {
  return {
    stripeCustomerId: String(object.id ?? ''),
    email: object.email ?? null,
  };
}
