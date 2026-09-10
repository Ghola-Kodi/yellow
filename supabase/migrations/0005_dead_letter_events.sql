-- =============================================================================
-- 0005 — dead_letter_events
-- If a Supabase write fails while handling a webhook, the raw event lands here
-- instead of being dropped, so it can be replayed later. The webhook still
-- returns 200 to Stripe (Stripe did its job; we replay from this table).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dead_letter_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text,
  event_type text NOT NULL,
  raw_payload jsonb NOT NULL,
  error text,
  replay_attempts integer NOT NULL DEFAULT 0,
  replayed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_replay_attempts
  ON public.dead_letter_events (replay_attempts);

ALTER TABLE public.dead_letter_events DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dead_letter_events TO anon, authenticated, service_role;
