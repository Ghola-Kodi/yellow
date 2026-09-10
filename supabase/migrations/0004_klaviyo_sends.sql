-- =============================================================================
-- 0004 — klaviyo_sends
-- The send ledger + the idempotency guards against double-sending:
--   1. UNIQUE (dunning_attempt_id, klaviyo_event_name) — one send per attempt/event.
--   2. Partial unique on (dunning_cycle_id, klaviyo_event_name) for off-ramp
--      events (payment_recovered / subscription_canceled) which have no attempt.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.klaviyo_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  dunning_cycle_id uuid NOT NULL REFERENCES public.dunning_cycles (id) ON DELETE CASCADE,
  dunning_attempt_id uuid REFERENCES public.dunning_attempts (id) ON DELETE SET NULL,
  klaviyo_event_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  response_payload jsonb,
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dunning_attempt_id, klaviyo_event_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_klaviyo_sends_offramp_per_cycle
  ON public.klaviyo_sends (dunning_cycle_id, klaviyo_event_name)
  WHERE dunning_attempt_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_klaviyo_sends_status
  ON public.klaviyo_sends (status);
CREATE INDEX IF NOT EXISTS idx_klaviyo_sends_created_at
  ON public.klaviyo_sends (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_klaviyo_sends_pending_retry
  ON public.klaviyo_sends (status, next_retry_at);

DROP TRIGGER IF EXISTS trg_klaviyo_sends_updated_at ON public.klaviyo_sends;
CREATE TRIGGER trg_klaviyo_sends_updated_at
  BEFORE UPDATE ON public.klaviyo_sends
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.klaviyo_sends DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.klaviyo_sends TO anon, authenticated, service_role;
