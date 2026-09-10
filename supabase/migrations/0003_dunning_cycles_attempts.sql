-- =============================================================================
-- 0003 — dunning_cycles + dunning_attempts
-- A cycle = one invoice that entered dunning. A new billing period always
-- opens a new cycle, so a stale 'active' from a prior period never suppresses
-- the new period's emails.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dunning_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  invoice_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'recovered', 'exhausted')),
  resolution_type text
    CHECK (resolution_type IN (
      'original_invoice_paid', 'card_updated_new_invoice', 'canceled', 'exhausted'
    )),
  stripe_retry_count integer NOT NULL DEFAULT 0,
  amount_due integer NOT NULL DEFAULT 0,
  amount_remaining integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dunning_cycles_subscription
  ON public.dunning_cycles (subscription_id);
CREATE INDEX IF NOT EXISTS idx_dunning_cycles_status
  ON public.dunning_cycles (status);
CREATE INDEX IF NOT EXISTS idx_dunning_cycles_started_at
  ON public.dunning_cycles (started_at DESC);

CREATE TABLE IF NOT EXISTS public.dunning_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dunning_cycle_id uuid NOT NULL REFERENCES public.dunning_cycles (id) ON DELETE CASCADE,
  stripe_decline_code text NOT NULL,
  decline_category text NOT NULL
    CHECK (decline_category IN ('soft_retry', 'hard_update_required', 'auth_required', 'final_notice')),
  attempt_number integer NOT NULL DEFAULT 1,
  amount_due integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dunning_attempts_cycle
  ON public.dunning_attempts (dunning_cycle_id);
CREATE INDEX IF NOT EXISTS idx_dunning_attempts_category
  ON public.dunning_attempts (decline_category);

DROP TRIGGER IF EXISTS trg_dunning_cycles_updated_at ON public.dunning_cycles;
CREATE TRIGGER trg_dunning_cycles_updated_at
  BEFORE UPDATE ON public.dunning_cycles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.dunning_cycles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_attempts DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_cycles TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_attempts TO anon, authenticated, service_role;
