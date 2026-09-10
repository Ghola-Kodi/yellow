/**
 * Row types mirroring the Supabase dunning schema (migrations 0001–0008).
 * Supabase returns snake_case columns, so these stay snake_case on purpose.
 */

export type DeclineCategory =
  | 'soft_retry'
  | 'hard_update_required'
  | 'auth_required'
  | 'final_notice';

export type DunningCycleStatus = 'active' | 'recovered' | 'exhausted';

export type ResolutionType =
  | 'original_invoice_paid'
  | 'card_updated_new_invoice'
  | 'canceled'
  | 'exhausted';

export type KlaviyoSendStatus = 'pending' | 'sent' | 'failed';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

export type WebhookReceiptStatus = 'processed' | 'failed' | 'ignored';

export interface CustomerRow {
  id: string;
  stripe_customer_id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  customer_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  updated_at: string;
}

export interface DunningCycleRow {
  id: string;
  subscription_id: string;
  customer_id: string;
  invoice_id: string;
  status: DunningCycleStatus;
  resolution_type: ResolutionType | null;
  stripe_retry_count: number;
  amount_due: number;
  amount_remaining: number;
  started_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DunningAttemptRow {
  id: string;
  dunning_cycle_id: string;
  stripe_decline_code: string;
  decline_category: DeclineCategory;
  attempt_number: number;
  amount_due: number;
  created_at: string;
}

export interface KlaviyoSendRow {
  id: string;
  customer_id: string;
  dunning_cycle_id: string;
  dunning_attempt_id: string | null;
  klaviyo_event_name: string;
  status: KlaviyoSendStatus;
  response_payload: unknown;
  error: string | null;
  retry_count: number;
  next_retry_at: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookReceiptRow {
  id: string;
  stripe_event_id: string;
  event_type: string;
  raw_payload: unknown;
  status: WebhookReceiptStatus;
  error: string | null;
  received_at: string;
  processed_at: string | null;
}

export interface DeadLetterRow {
  id: string;
  stripe_event_id: string | null;
  event_type: string;
  raw_payload: unknown;
  error: string | null;
  replay_attempts: number;
  replayed_at: string | null;
  created_at: string;
}
