/**
 * Dunning configuration + Klaviyo event-name mapping.
 * Event/flow names are tied 1:1 to decline categories (spec Section 6) so a
 * Klaviyo flow's metric trigger always matches exactly what the worker sends.
 *
 * This module is server-only (reads process.env at import time).
 */

import type { DeclineCategory } from './decline-classification';

export const DUNNING_EVENT_NAMES: Record<DeclineCategory, string> = {
  soft_retry: process.env.KLAVIYO_EVENT_SOFT_RETRY ?? 'dunning-soft-retry',
  hard_update_required:
    process.env.KLAVIYO_EVENT_HARD_UPDATE_REQUIRED ?? 'dunning-hard-update-required',
  auth_required: process.env.KLAVIYO_EVENT_AUTH_REQUIRED ?? 'dunning-auth-required',
  final_notice: process.env.KLAVIYO_EVENT_FINAL_NOTICE ?? 'dunning-final-notice',
};

export const OFF_RAMP_EVENTS = {
  recovered: process.env.KLAVIYO_EVENT_RECOVERED ?? 'payment_recovered',
  canceled: process.env.KLAVIYO_EVENT_CANCELED ?? 'subscription_canceled',
} as const;

export interface DunningConfig {
  /** Minimum Stripe invoice attempt_count before we send the first dunning email. */
  startAfterAttempt: number;
  /** Attempt count at which we switch to the "final notice" email. */
  maxAttempts: number;
  /** Hours after a final-notice send before the backend gives up and cancels. */
  giveUpHours: number;
}

export function getDunningConfig(): DunningConfig {
  return {
    startAfterAttempt: Number(process.env.DUNNING_START_AFTER_ATTEMPT) || 2,
    maxAttempts: Number(process.env.DUNNING_MAX_ATTEMPTS) || 4,
    giveUpHours: Number(process.env.DUNNING_GIVE_UP_HOURS) || 72,
  };
}

/** URL the email CTA points to (the app's hosted update-card page). */
export function getUpdateCardUrl(stripeCustomerId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/dashboard/update-card?customer=${encodeURIComponent(stripeCustomerId)}`;
}
