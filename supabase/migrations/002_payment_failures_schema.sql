CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE,
  customer_id TEXT,
  customer_email TEXT NOT NULL,
  stripe_customer_id TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'retrying', 'sent', 'recovered', 'failed', 'requires_action')
  ),
  decline_type TEXT NOT NULL DEFAULT 'soft' CHECK (
    decline_type IN ('soft', 'hard')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  recovery_status TEXT NOT NULL DEFAULT 'pending',
  klaviyo_flow_status TEXT NOT NULL DEFAULT 'not_sent',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_failures_status
  ON public.payment_failures (status);

CREATE INDEX IF NOT EXISTS idx_payment_failures_created_at
  ON public.payment_failures (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_failures_email
  ON public.payment_failures (customer_email);

CREATE INDEX IF NOT EXISTS idx_payment_failures_customer_id
  ON public.payment_failures (stripe_customer_id);

CREATE OR REPLACE FUNCTION public.update_payment_failures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_failures_updated_at ON public.payment_failures;

CREATE TRIGGER trg_payment_failures_updated_at
BEFORE UPDATE ON public.payment_failures
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_failures_updated_at();

ALTER TABLE public.payment_failures DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.payment_failures TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_failures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_failures TO authenticated;
