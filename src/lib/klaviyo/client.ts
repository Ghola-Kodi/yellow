const klaviyoPrivateKey = process.env.KLAVIYO_PRIVATE_API_KEY;

// Klaviyo retired the entire legacy v1/v2 API (including v1/track) on
// June 30, 2024 — calls to it now return 410 Gone. All events go through
// the current Events API instead. Revision header is required on every
// call; bump this when Klaviyo's stable revision moves forward.
// https://developers.klaviyo.com/en/reference/create_event
const KLAVIYO_REVISION = '2026-07-15';

export const klaviyoClient = {
  async post(path: string, body: Record<string, unknown>) {
    if (!klaviyoPrivateKey) {
      console.warn('⚠️ Klaviyo call skipped — KLAVIYO_PRIVATE_API_KEY is not set in this environment');
      return { ok: false, status: 0, skipped: true, reason: 'KLAVIYO_PRIVATE_API_KEY not set' };
    }

    const response = await fetch(`https://a.klaviyo.com/api/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Klaviyo-API-Key ${klaviyoPrivateKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        revision: KLAVIYO_REVISION,
      },
      body: JSON.stringify(body),
    });

    return {
      ok: response.ok,
      status: response.status,
      json: async () => response.json(),
    };
  },
};

// Event names should match whatever metric each Klaviyo flow is triggered
// on. Configure these to match your actual flow trigger names in Klaviyo.
const DECLINE_EVENT_NAMES: Record<'soft' | 'hard', string> = {
  soft: process.env.KLAVIYO_SOFT_DECLINE_EVENT ?? 'Payment Failed - Soft Decline',
  hard: process.env.KLAVIYO_HARD_DECLINE_EVENT ?? 'Payment Failed - Hard Decline',
};

export async function triggerDunningEmail(params: {
  email: string;
  declineType: 'soft' | 'hard';
  amountCents: number;
  currency: string;
  uniqueId?: string; // pass a stable id (Stripe event/PI id) so retries don't double-send
}) {
  const eventName = DECLINE_EVENT_NAMES[params.declineType];

  const result = await klaviyoClient.post('events', {
    data: {
      type: 'event',
      attributes: {
        ...(params.uniqueId ? { unique_id: params.uniqueId } : {}),
        metric: {
          data: {
            type: 'metric',
            attributes: { name: eventName },
          },
        },
        profile: {
          data: {
            type: 'profile',
            attributes: { email: params.email },
          },
        },
        value: params.amountCents / 100,
        properties: {
          decline_type: params.declineType,
          amount: params.amountCents / 100,
          currency: params.currency,
        },
      },
    },
  });

  return { eventName, ...result };
}
