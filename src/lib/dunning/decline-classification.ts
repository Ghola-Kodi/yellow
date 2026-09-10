/**
 * Decline-code classification.
 *
 * Stripe emits dozens of raw decline codes. We collapse them into functional
 * buckets so we template one Klaviyo flow per bucket (Section 4 of the spec)
 * instead of one template per code. The raw code is still persisted on
 * `dunning_attempts.stripe_decline_code` for audit and debugging.
 */

export type DeclineCategory =
  | 'soft_retry'
  | 'hard_update_required'
  | 'auth_required'
  | 'final_notice';

export interface DeclineClassification {
  category: DeclineCategory;
  /** Human-readable reason, safe to show the customer in an email. */
  message: string;
  /** Backend-computed CTA label — single source of truth for "what to do next". */
  ctaLabel: string;
}

/**
 * Stripe will keep retrying these automatically (Smart Retries). The customer
 * usually needs to do nothing.
 */
const SOFT_RETRY_CODES = new Set([
  'insufficient_funds',
  'balance_insufficient',
  'do_not_honor',
  'processing_error',
  'issuer_not_available',
  'try_again_later',
  'generic_decline',
  'card_declined',
]);

/**
 * The card itself is unusable — retrying will not help. The customer must
 * update their payment method.
 */
const HARD_UPDATE_CODES = new Set([
  'expired_card',
  'lost_card',
  'stolen_card',
  'pickup_card',
  'incorrect_number',
  'incorrect_cvc',
  'incorrect_zip',
  'invalid_number',
  'invalid_expiry_month',
  'invalid_expiry_year',
  'invalid_cvc',
  'invalid_account',
  'card_not_supported',
  'currency_not_supported',
  'new_account_information_available',
  'service_not_allowed',
]);

/**
 * 3-D Secure / SCA — the customer must explicitly confirm the payment with
 * their bank.
 */
const AUTH_REQUIRED_CODES = new Set([
  'authentication_required',
  'authentication_required_3ds',
  'consent_required',
]);

const DEFAULT_MESSAGES: Record<DeclineCategory, string> = {
  soft_retry: 'Your bank declined the payment, but this usually clears up on its own.',
  hard_update_required: 'Your card was declined — it needs to be updated before we can bill you.',
  auth_required: 'Your bank needs you to confirm this payment before it can go through.',
  final_notice: 'This is the final attempt to collect payment before your subscription is paused.',
};

const DEFAULT_CTA_LABELS: Record<DeclineCategory, string> = {
  soft_retry: 'No action needed',
  hard_update_required: 'Update payment method',
  auth_required: 'Confirm payment',
  final_notice: 'Update payment method',
};

/** Friendly copy for the most common raw codes, shown in the email body. */
const CODE_MESSAGES: Record<string, string> = {
  insufficient_funds: 'Your card has insufficient funds.',
  balance_insufficient: 'Your card has insufficient funds.',
  expired_card: 'Your card has expired.',
  lost_card: 'Your card was reported lost.',
  stolen_card: 'Your card was reported stolen.',
  pickup_card: 'Your bank has restricted this card.',
  incorrect_number: "The card number doesn't match your account.",
  incorrect_cvc: 'The security code was incorrect.',
  incorrect_zip: 'The billing ZIP code was incorrect.',
  card_not_supported: 'Your card does not support this type of payment.',
  invalid_account: 'Your bank account is no longer valid.',
  authentication_required: 'Your bank requires additional confirmation.',
  consent_required: 'Your bank requires consent before this payment can process.',
};

export function classifyDecline(code: string | null | undefined): DeclineClassification {
  const normalized = (code ?? '').trim().toLowerCase() || 'generic_decline';

  let category: DeclineCategory;
  if (AUTH_REQUIRED_CODES.has(normalized)) {
    category = 'auth_required';
  } else if (HARD_UPDATE_CODES.has(normalized)) {
    category = 'hard_update_required';
  } else if (SOFT_RETRY_CODES.has(normalized)) {
    category = 'soft_retry';
  } else {
    // Unknown code — safest CTA is "update your card" rather than claiming
    // we'll retry automatically.
    category = 'hard_update_required';
  }

  return {
    category,
    message: CODE_MESSAGES[normalized] ?? DEFAULT_MESSAGES[category],
    ctaLabel: DEFAULT_CTA_LABELS[category],
  };
}

/** Category for the final attempt in a cycle — a state, not a decline code. */
export function isFinalNotice(category: DeclineCategory): boolean {
  return category === 'final_notice';
}
