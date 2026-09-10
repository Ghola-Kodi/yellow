-- =============================================================================
-- 0008 — deterministic demo seed (idempotent)
-- Populates the dashboard with realistic historical data so the portfolio
-- shows recovery analytics immediately. Uses fixed UUIDs so FKs are stable.
-- Safe to re-run: ON CONFLICT DO NOTHING.
-- =============================================================================

INSERT INTO public.customers (id, stripe_customer_id, email) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'cus_demo_001', 'sarah.chen@example.com'),
  ('c0000000-0000-4000-8000-000000000002', 'cus_demo_002', 'marcus.reyes@example.com'),
  ('c0000000-0000-4000-8000-000000000003', 'cus_demo_003', 'priya.nair@example.com')
ON CONFLICT (stripe_customer_id) DO NOTHING;

INSERT INTO public.subscriptions (id, customer_id, stripe_subscription_id, status) VALUES
  ('11111111-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'sub_demo_001', 'active'),
  ('11111111-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'sub_demo_002', 'past_due'),
  ('11111111-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'sub_demo_003', 'active')
ON CONFLICT (stripe_subscription_id) DO NOTHING;

-- Cycle A: recovered via original invoice paid (soft retry).
INSERT INTO public.dunning_cycles
  (id, subscription_id, customer_id, invoice_id, status, resolution_type,
   stripe_retry_count, amount_due, amount_remaining, started_at, resolved_at)
VALUES
  ('d0000000-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001',
   'c0000000-0000-4000-8000-000000000001', 'in_demo_001', 'recovered', 'original_invoice_paid',
   2, 4900, 0, now() - interval '5 days', now() - interval '3 days')
ON CONFLICT (invoice_id) DO NOTHING;

-- Cycle B: active, hard decline, still dunning.
INSERT INTO public.dunning_cycles
  (id, subscription_id, customer_id, invoice_id, status, resolution_type,
   stripe_retry_count, amount_due, amount_remaining, started_at)
VALUES
  ('d0000000-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002',
   'c0000000-0000-4000-8000-000000000002', 'in_demo_002', 'active', NULL,
   0, 4900, 4900, now() - interval '6 hours')
ON CONFLICT (invoice_id) DO NOTHING;

-- Cycle C: exhausted (gave up / canceled).
INSERT INTO public.dunning_cycles
  (id, subscription_id, customer_id, invoice_id, status, resolution_type,
   stripe_retry_count, amount_due, amount_remaining, started_at, resolved_at)
VALUES
  ('d0000000-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000003',
   'c0000000-0000-4000-8000-000000000003', 'in_demo_003', 'exhausted', 'exhausted',
   4, 4900, 4900, now() - interval '14 days', now() - interval '7 days')
ON CONFLICT (invoice_id) DO NOTHING;

INSERT INTO public.dunning_attempts
  (id, dunning_cycle_id, stripe_decline_code, decline_category, attempt_number, amount_due, created_at)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'insufficient_funds', 'soft_retry', 1, 4900, now() - interval '5 days'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'insufficient_funds', 'soft_retry', 2, 4900, now() - interval '4 days'),
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'expired_card', 'hard_update_required', 1, 4900, now() - interval '6 hours'),
  ('a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'card_not_supported', 'hard_update_required', 1, 4900, now() - interval '14 days')
ON CONFLICT DO NOTHING;

INSERT INTO public.klaviyo_sends
  (id, customer_id, dunning_cycle_id, dunning_attempt_id, klaviyo_event_name, status, sent_at)
VALUES
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'dunning-soft-retry', 'sent', now() - interval '5 days'),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'dunning-soft-retry', 'sent', now() - interval '4 days'),
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', NULL, 'payment_recovered', 'sent', now() - interval '3 days'),
  ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'dunning-hard-update-required', 'sent', now() - interval '6 hours'),
  ('e0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'dunning-hard-update-required', 'sent', now() - interval '14 days')
ON CONFLICT DO NOTHING;
