-- =============================================================================
-- 0099 — legacy cleanup (drop the OLD flat schema)
-- The old flat schema (payment_failures, profiles, demo_requests + their views)
-- is replaced by the normalized dunning model in 0001–0008. Run this after
-- 0001–0008 so the portfolio shows one clean architecture and no dead tables.
--
-- Idempotent: DROP IF EXISTS + CASCADE.
-- =============================================================================

DROP VIEW IF EXISTS public.demo_conversion_funnel CASCADE;
DROP VIEW IF EXISTS public.dunning_resolution_by_industry CASCADE;
DROP VIEW IF EXISTS public.flow_performance CASCADE;
DROP VIEW IF EXISTS public.active_dunning_cases CASCADE;
DROP VIEW IF EXISTS public.customer_dunning_summary CASCADE;

DROP TABLE IF EXISTS public.payment_failures CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.demo_requests CASCADE;

-- Old trigger helper from the flat schema (dropped with the table's trigger,
-- but clean it up explicitly too).
DROP FUNCTION IF EXISTS public.update_payment_failures_updated_at() CASCADE;
