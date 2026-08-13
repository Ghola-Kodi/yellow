CREATE TABLE IF NOT EXISTS public.demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  industry TEXT NOT NULL CHECK (industry IN ('real_estate', 'ecommerce', 'fashion')),
  scenario TEXT NOT NULL CHECK (scenario IN ('soft-reminder', 'hard-urgent', 'final-winback')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  template_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_industry
  ON public.demo_requests (industry);

CREATE INDEX IF NOT EXISTS idx_demo_requests_scenario
  ON public.demo_requests (scenario);

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at
  ON public.demo_requests (created_at DESC);

CREATE OR REPLACE VIEW public.demo_conversion_funnel AS
SELECT
  industry,
  scenario,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / NULLIF(COUNT(*), 0), 2) AS send_rate_pct,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM public.demo_requests
GROUP BY industry, scenario
ORDER BY industry, scenario;

ALTER TABLE public.demo_requests DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.demo_requests TO postgres, anon, authenticated;
GRANT ALL ON public.demo_conversion_funnel TO postgres, anon, authenticated;
