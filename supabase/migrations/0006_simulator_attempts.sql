-- =============================================================================
-- 0006 — simulator_attempts
-- Rate-limiting ledger for the Stripe failure simulator (per IP + email).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.simulator_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulator_attempts_ip
  ON public.simulator_attempts (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_simulator_attempts_email
  ON public.simulator_attempts (email, created_at DESC);

ALTER TABLE public.simulator_attempts DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulator_attempts TO anon, authenticated, service_role;
