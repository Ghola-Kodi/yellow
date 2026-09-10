-- =============================================================================
-- 0002 — customers + subscriptions
-- customers:      one row per Stripe customer.
-- subscriptions:  one row per Stripe subscription — required to correctly
--                 support customers who hold more than one subscription.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_customer_id text NOT NULL UNIQUE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN (
      'trialing', 'active', 'past_due', 'canceled',
      'incomplete', 'incomplete_expired', 'unpaid', 'paused'
    )),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id
  ON public.subscriptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions (status);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO anon, authenticated, service_role;
