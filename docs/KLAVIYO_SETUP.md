# Klaviyo setup guide

The worker sends **Klaviyo Events API v3** events. Each event has a metric
name, and a flow triggers on that metric. The flow/event names are tied 1:1.

## 1. Event names (metrics)

| Decline category | Event name (default) | Env override |
|---|---|---|
| soft retry | `dunning-soft-retry` | `KLAVIYO_EVENT_SOFT_RETRY` |
| update card | `dunning-hard-update-required` | `KLAVIYO_EVENT_HARD_UPDATE_REQUIRED` |
| auth required | `dunning-auth-required` | `KLAVIYO_EVENT_AUTH_REQUIRED` |
| final notice | `dunning-final-notice` | `KLAVIYO_EVENT_FINAL_NOTICE` |
| off-ramp: recovered | `payment_recovered` | `KLAVIYO_EVENT_RECOVERED` |
| off-ramp: cancelled | `subscription_canceled` | `KLAVIYO_EVENT_CANCELED` |

You do **not** create metrics by hand — Klaviyo creates the metric
automatically the first time the event arrives. Just make sure the flow's
trigger metric name matches the event name exactly (they are case-sensitive).

## 2. Create one flow per category

In Klaviyo → **Flows → Create Flow**, choose **Metric** as the trigger and type
the exact event name:

- Flow A → trigger metric `dunning-soft-retry`
- Flow B → trigger metric `dunning-hard-update-required`
- Flow C → trigger metric `dunning-auth-required`
- Flow D → trigger metric `dunning-final-notice`

The worker sends these event properties, usable as template variables:

| Property | Example |
|---|---|
| `decline_code` | `insufficient_funds` |
| `decline_category` | `soft_retry` |
| `decline_message` | `Your card has insufficient funds.` |
| `amount_due` | `49.00` |
| `amount_due_cents` | `4900` |
| `attempt_number` | `2` |
| `invoice_id` | `in_demo_...` |
| `cta_label` | `Update payment method` |
| `cta_url` | `https://app.example.com/dashboard/update-card?customer=…` |

Use `cta_label` and `cta_url` for the button (the backend is the single source
of truth for "what should this customer do next"). Vary copy/tone with
Klaviyo's conditional content blocks only if you need finer control — not one
template per raw decline code.

## 3. Flow exit logic

Klaviyo has no "remove from flow" API — exits happen via **flow filters**
re-evaluated at each time-delay step. On every email step, add a flow filter:

> **has not received** `payment_recovered` **or** `subscription_canceled`
> since entering the flow

Keep the delays between steps short (e.g. hours, not days) so a customer who
recovers is removed from the sequence quickly.

## 4. Off-ramp flows

Create two more metric-triggered flows:

- `payment_recovered` → "Thanks, you're all set" (sent the instant Stripe
  confirms a successful charge).
- `subscription_canceled` → "Sorry to see you go" (sent after the backend
  gives up and cancels the subscription in Stripe).

## 5. Verify end-to-end

1. Run the app, open `/dashboard/simulator`.
2. Enter a real test inbox and click **Run demo flow**.
3. Confirm the event appears in Klaviyo → **Analytics → Metrics**, and the
   email lands in the inbox with a working "Update payment method" button.
