-- =============================================================================
-- 0001 — webhook_receipts + shared helpers
-- A durable receipt for every Stripe webhook. stripe_event_id is the
-- idempotency key: Stripe redelivers events, so we must never process the
-- same event twice.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared "updated_at" trigger, used by several tables later in the chain.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.webhook_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  raw_payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'processed'
    CHECK (status IN ('processed', 'failed', 'ignored')),
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webhook_receipts_event_type
  ON public.webhook_receipts (event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_receipts_received_at
  ON public.webhook_receipts (received_at DESC);

ALTER TABLE public.webhook_receipts DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_receipts
  TO anon, authenticated, service_role;
