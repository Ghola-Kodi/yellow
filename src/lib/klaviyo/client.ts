const klaviyoPrivateKey = process.env.KLAVIYO_PRIVATE_API_KEY;

export const klaviyoClient = {
  async post(path: string, body: Record<string, unknown>) {
    if (!klaviyoPrivateKey) {
      return { ok: false, status: 0, skipped: true, reason: 'KLAVIYO_PRIVATE_API_KEY not set' };
    }

    const response = await fetch(`https://a.klaviyo.com/api/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Klaviyo-API-Key ${klaviyoPrivateKey}`,
        'Content-Type': 'application/json',
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
}) {
  const eventName = DECLINE_EVENT_NAMES[params.declineType];

  const result = await klaviyoClient.post('v1/track', {
    token: klaviyoPrivateKey ?? '',
    event: eventName,
    customer_properties: {
      $email: params.email,
    },
    properties: {
      decline_type: params.declineType,
      amount: params.amountCents / 100,
      currency: params.currency,
    },
  });

  return { eventName, ...result };
}
