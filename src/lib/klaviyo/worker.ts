/**
 * Async dunning worker.
 *
 * The webhook handler never calls Klaviyo — it only enqueues `klaviyo_sends`
 * rows with status 'pending'. This worker (invoked by the cron endpoint) picks
 * up due sends, performs the outbound Klaviyo call, and records the outcome.
 * On failure it backs off (respecting Retry-After on 429) and retries; after
 * MAX_RETRIES it marks the row 'failed' and alerts.
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { KlaviyoSendRow } from '@/types/dunning';
import { sendKlaviyoEvent, parseRetryAfterMs } from './events';
import { classifyDecline } from '@/lib/dunning/decline-classification';
import { getUpdateCardUrl } from '@/lib/dunning/constants';

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 60_000; // 1 minute, doubles each retry
const MAX_BACKOFF_MS = 30 * 60_000; // cap at 30 minutes
const BATCH_SIZE = 50;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

export interface WorkerResult {
  skipped?: boolean;
  reason?: string;
  error?: string;
  sent: number;
  retried: number;
  failed: number;
}

export async function runDunningWorker(): Promise<WorkerResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { skipped: true, reason: 'supabase_not_configured', sent: 0, retried: 0, failed: 0 };
  }

  const now = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from('klaviyo_sends')
    .select(
      `
        id, klaviyo_event_name, status, retry_count, dunning_attempt_id, customer_id, dunning_cycle_id,
        customers (id, email, stripe_customer_id),
        dunning_cycles (id, invoice_id, amount_due),
        dunning_attempts (id, stripe_decline_code, decline_category, attempt_number, amount_due)
      `,
    )
    .eq('status', 'pending')
    .lte('next_retry_at', now)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return { error: error.message, sent: 0, retried: 0, failed: 0 };
  }

  const result: WorkerResult = { sent: 0, retried: 0, failed: 0 };

  for (const raw of (rows ?? []) as Record<string, any>[]) {
    const send = raw as unknown as KlaviyoSendRow;
    const customer = first(raw.customers as any);
    const cycle = first(raw.dunning_cycles as any);
    const attempt = first(raw.dunning_attempts as any);

    if (!customer?.email) {
      await supabase
        .from('klaviyo_sends')
        .update({ status: 'failed', error: 'missing customer email' })
        .eq('id', send.id);
      result.failed++;
      continue;
    }

    const isOffRamp = !send.dunning_attempt_id;
    const eventName = send.klaviyo_event_name;

    let properties: Record<string, unknown>;
    let value: number | undefined;
    let uniqueId: string;

    if (!isOffRamp && attempt) {
      const classification = classifyDecline(attempt.stripe_decline_code);
      const isFinal = eventName.includes('final-notice');
      properties = {
        decline_code: attempt.stripe_decline_code,
        decline_category: isFinal ? 'final_notice' : attempt.decline_category,
        decline_message: classification.message,
        amount_due: (attempt.amount_due ?? 0) / 100,
        amount_due_cents: attempt.amount_due ?? 0,
        attempt_number: attempt.attempt_number,
        invoice_id: cycle?.invoice_id ?? '',
        cta_label: classification.ctaLabel,
        cta_url: getUpdateCardUrl(customer.stripe_customer_id ?? ''),
      };
      value = (attempt.amount_due ?? 0) / 100;
      uniqueId = `${cycle?.invoice_id ?? 'inv'}-${attempt.id}`;
    } else {
      properties = {
        invoice_id: cycle?.invoice_id ?? '',
        amount_due: (cycle?.amount_due ?? 0) / 100,
        event: eventName,
      };
      uniqueId = `${cycle?.invoice_id ?? 'inv'}-${eventName}`;
    }

    const response = await sendKlaviyoEvent({
      email: customer.email,
      eventName,
      properties,
      value,
      uniqueId,
    });

    if (response.ok) {
      await supabase
        .from('klaviyo_sends')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          response_payload: response.data ?? null,
          error: null,
        })
        .eq('id', send.id);
      result.sent++;
      continue;
    }

    // Failure — back off and retry, then permanently fail after MAX_RETRIES.
    const retryCount = (send.retry_count ?? 0) + 1;
    if (retryCount >= MAX_RETRIES) {
      await supabase
        .from('klaviyo_sends')
        .update({
          status: 'failed',
          error: response.error ?? response.errorCode ?? 'klaviyo_send_failed',
          response_payload: (response.detail as unknown) ?? null,
        })
        .eq('id', send.id);
      // Alert — this is a customer who never found out their card declined.
      console.error('❌ Klaviyo send permanently failed', {
        sendId: send.id,
        email: customer.email,
        eventName,
        error: response.error,
      });
      result.failed++;
    } else {
      const backoffMs =
        parseRetryAfterMs(response) ??
        Math.min(BASE_BACKOFF_MS * 2 ** (retryCount - 1), MAX_BACKOFF_MS);
      await supabase
        .from('klaviyo_sends')
        .update({
          retry_count: retryCount,
          next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
          error: response.error ?? null,
        })
        .eq('id', send.id);
      result.retried++;
    }
  }

  return result;
}
