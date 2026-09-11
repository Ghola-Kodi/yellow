# Revivo — Stripe → Supabase → Klaviyo Dunning Engine

A standalone revenue-recovery (dunning) system that reduces involuntary churn
from failed card payments. It is intentionally **decoupled from the main
product**: Stripe is the source of truth for payment/subscription state, and
this service owns *communication and recovery orchestration only* — never
entitlements.

```
Stripe webhook ──► /api/webhooks/stripe ──► Supabase (receipts, cycles, attempts, sends)
                                                    │
                             (async worker via cron) │  polls pending sends
                                                    ▼
                                     Klaviyo Events API ──► Flows ──► email
                                                    ▲
                payment_recovered / subscription_canceled (off-ramp events)
```

## What it does

- **Detects every failed payment** via Stripe webhooks and classifies *why* it
  failed into four functional buckets (not one template per decline code):
  `soft_retry`, `hard_update_required`, `auth_required`, `final_notice`.
- **Never double-sends or emails too early**: webhook idempotency via
  `webhook_receipts`, a send-level unique constraint, and a check on
  `invoice.attempt_count` so it doesn't step on Stripe's own Smart Retries.
- **Sends email asynchronously**: the webhook handler only writes to Supabase
  and returns fast; a cron-driven worker performs the Klaviyo call with
  retry/backoff and `Retry-After` handling.
- **Resolves cycles correctly**: fires `payment_recovered` the instant Stripe
  confirms a charge, distinguishes "paid the original invoice" from "updated
  card, new invoice succeeded", and `subscription_canceled` after a time-based
  give-up decision that actually cancels the subscription in Stripe.
- **Is auditable**: every decision — why an email was sent, why a subscription
  was or wasn't cancelled — is a database row you can inspect.
- **Has a dead-letter queue**: if a Supabase write fails, the raw event is kept
  for replay instead of being dropped, and the webhook still returns 200.

## Stack

Next.js (App Router) · Supabase (Postgres) · Klaviyo (Events API v3 + Flows) ·
Stripe (webhooks + API) · Tailwind CSS · framer-motion

## Quick start

1. **Install** — `npm install`
2. **Configure** — copy `.env.example` to `.env.local` and fill in the keys
   (see table below).
3. **Create the schema** — run the SQL files in `supabase/migrations/` in
   numeric order in the Supabase SQL Editor (or `supabase db push`).
4. **Run** — `npm run dev`, open `http://localhost:3000/dashboard`.
5. **Demo** — go to `/dashboard/simulator`, enter a test email, and hit
   *Run demo flow*. It injects a failed payment, runs the worker, and a real
   Klaviyo email lands in the inbox.

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **publishable/anon** key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **secret/service-role** key (`sb_secret_…`) — server only |
| `STRIPE_SECRET_KEY` | Stripe test secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `KLAVIYO_PRIVATE_API_KEY` | Klaviyo private API key |
| `NEXT_PUBLIC_APP_URL` | *Optional* — public base URL for email CTAs (auto-detected on Vercel, including custom domains) |
| `CRON_SECRET` | Protects the cron endpoint |
| `DUNNING_START_AFTER_ATTEMPT` | Stripe attempts before the first dunning email (default 2) |
| `DUNNING_MAX_ATTEMPTS` | Attempt count that triggers the final notice (default 4) |
| `DUNNING_GIVE_UP_HOURS` | Hours after final notice before cancellation (default 72) |

## Project structure

```
supabase/migrations/          # ordered SQL schema (run in numeric order)
src/app/api/webhooks/stripe/  # Stripe webhook: verify → dedupe → write → ack
src/app/api/cron/dunning/     # cron endpoint: worker + give-up + dead-letter replay
src/app/api/demo/             # simulator: inject a failure, run the worker
src/app/api/reporting/        # dashboard data
src/app/api/admin/            # admin actions (cancel a cycle)
src/lib/dunning/              # classification, state machine, give-up, parsers
src/lib/klaviyo/              # Events API v3 client + async worker
src/lib/webhook/              # shared event dispatcher + dead-letter queue
src/app/dashboard/            # dashboard + simulator UI
```

## Klaviyo setup

See [`docs/KLAVIYO_SETUP.md`](docs/KLAVIYO_SETUP.md) for the exact metric/event
names and flow configuration (one flow per decline category, with flow-filter
exit logic).

## Scheduling the async worker

The webhook handler never calls Klaviyo directly — a separate worker picks up
pending sends. The worker runs at `POST /api/cron/dunning`.

- **Vercel Hobby (free)** — cron jobs aren't available, so a GitHub Actions
  schedule pings the endpoint instead (see `.github/workflows/dunning-cron.yml`).
  Add two repo secrets: `APP_URL` (your deployed URL) and `CRON_SECRET` (must
  match the `CRON_SECRET` env var set on Vercel).
- **Vercel Pro / self-hosted** — use a native cron, or any external scheduler
  (cron-job.org, etc.) hitting the same endpoint with
  `Authorization: Bearer $CRON_SECRET`.

## Deployment (Vercel)

1. **Import the repo** — Vercel auto-detects Next.js.
2. **Custom domain** (optional) — Project → Settings → Domains → add your
   domain, then add the DNS record Vercel shows (an A record or
   `cname.vercel-dns.com`) at your DNS provider. The app auto-detects it via
   `VERCEL_PROJECT_PRODUCTION_URL`, so no `NEXT_PUBLIC_APP_URL` is required.
3. **Env vars** — Project → Settings → Environment Variables: set the secrets
   from the table above (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `KLAVIYO_PRIVATE_API_KEY`, `CRON_SECRET`).
4. **Enable the demo** — set `ENABLE_DEMO=true` so `/dashboard/simulator` works
   on the live site.
5. **Schedule the worker** — set `CRON_SECRET`, then add the matching GitHub
   Actions secrets (`APP_URL`, `CRON_SECRET`) for `.github/workflows/dunning-cron.yml`.

## Notes on design boundaries

- The **main app owns entitlements**; this service never grants/revokes access.
  Stripe should send the same events to a *separate* webhook endpoint owned by
  the main app.
- Manual reactivation in an admin panel belongs to the main app; this service's
  admin actions (stop emails, cancel subscription) are separate.
