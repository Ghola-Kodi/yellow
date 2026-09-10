-- =============================================================================
-- 0007 — reporting views (dashboard + alerting)
-- =============================================================================

-- Recovery rate + time-to-recovery by decline category.
CREATE OR REPLACE VIEW public.recovery_by_category AS
SELECT
  da.decline_category,
  count(*) AS attempts,
  count(*) FILTER (WHERE dc.status = 'recovered') AS recovered,
  round(
    100.0 * count(*) FILTER (WHERE dc.status = 'recovered') / nullif(count(*), 0),
    1
  ) AS recovery_rate_pct,
  round(
    avg(extract(epoch FROM (dc.resolved_at - dc.started_at)) / 3600)
      FILTER (WHERE dc.status = 'recovered'),
    1
  ) AS avg_time_to_recovery_hours
FROM public.dunning_attempts da
JOIN public.dunning_cycles dc ON dc.id = da.dunning_cycle_id
GROUP BY da.decline_category;

-- Active cycles + how long they've been running (for the "approaching
-- cancellation" threshold in the dashboard).
CREATE OR REPLACE VIEW public.active_dunning_cycles AS
SELECT
  dc.id,
  c.email,
  s.stripe_subscription_id,
  dc.invoice_id,
  dc.started_at,
  dc.amount_due,
  dc.amount_remaining,
  dc.stripe_retry_count,
  round(extract(epoch FROM (now() - dc.started_at)) / 3600, 1) AS hours_active
FROM public.dunning_cycles dc
JOIN public.customers c ON c.id = dc.customer_id
JOIN public.subscriptions s ON s.id = dc.subscription_id
WHERE dc.status = 'active';

-- Klaviyo send failures — must be alerted on, not just logged.
CREATE OR REPLACE VIEW public.klaviyo_send_failures AS
SELECT
  ks.id,
  c.email,
  ks.klaviyo_event_name,
  ks.error,
  ks.retry_count,
  ks.created_at
FROM public.klaviyo_sends ks
JOIN public.customers c ON c.id = ks.customer_id
WHERE ks.status = 'failed';

GRANT SELECT ON public.recovery_by_category TO anon, authenticated, service_role;
GRANT SELECT ON public.active_dunning_cycles TO anon, authenticated, service_role;
GRANT SELECT ON public.klaviyo_send_failures TO anon, authenticated, service_role;
