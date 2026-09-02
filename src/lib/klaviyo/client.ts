const KLAVIYO_PRIVATE_API_KEY = process.env.KLAVIYO_PRIVATE_API_KEY;

// ⚠️ Klaviyo retired the legacy v1/v2 API (including v1/track) on June 30, 2024
// All events must use the current Events API with Bearer authentication
// https://developers.klaviyo.com/en/reference/create_event

const KLAVIYO_REVISION = process.env.KLAVIYO_REVISION || '2026-07-15'; // Allow overriding via env
const DEBUG = process.env.KLAVIYO_DEBUG === 'true';

interface KlaviyoEventResponse {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export const klaviyoClient = {
  async post(path: string, body: Record<string, unknown>): Promise<KlaviyoEventResponse> {
    if (!KLAVIYO_PRIVATE_API_KEY) {
      console.warn('⚠️ Klaviyo call skipped — KLAVIYO_PRIVATE_API_KEY is not set');
      return { 
        ok: false, 
        status: 0, 
        skipped: true, 
        reason: 'KLAVIYO_PRIVATE_API_KEY not set' 
      };
    }

    try {
      if (DEBUG) {
        console.debug('📤 Klaviyo API Call:', {
          path,
          body: JSON.stringify(body, null, 2),
          revision: KLAVIYO_REVISION,
        });
      }

      const response = await fetch(`https://a.klaviyo.com/api/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KLAVIYO_PRIVATE_API_KEY}`, // ✅ FIXED
          'Content-Type': 'application/json',
          Accept: 'application/json',
          revision: KLAVIYO_REVISION,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({ error: 'Could not parse response' }));

      if (!response.ok) {
        console.error('❌ Klaviyo API error:', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
      } else if (DEBUG) {
        console.debug('✅ Klaviyo API success:', data);
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
      };
    } catch (error) {
      console.error('🌐 Network error calling Klaviyo:', error);
      return {
        ok: false,
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

// Dunning event names - configure these to match your Klaviyo flow triggers
const DECLINE_EVENT_NAMES: Record<'soft' | 'hard', string> = {
  soft: process.env.KLAVIYO_SOFT_DECLINE_EVENT ?? 'Payment Failed - Soft Decline',
  hard: process.env.KLAVIYO_HARD_DECLINE_EVENT ?? 'Payment Failed - Hard Decline',
};

export async function triggerDunningEmail(params: {
  email: string;
  declineType: 'soft' | 'hard';
  amountCents: number;
  currency: string;
  uniqueId?: string; // Use stable ID (Stripe event/PI id) for idempotency
}) {
  // Input validation
  if (!params.email) {
    throw new Error('Email is required for Klaviyo dunning event');
  }
  
  if (params.amountCents <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const eventName = DECLINE_EVENT_NAMES[params.declineType];
  const amountDollars = params.amountCents / 100;

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
        value: amountDollars,
        properties: {
          decline_type: params.declineType,
          amount: amountDollars,
          currency: params.currency,
          amount_cents: params.amountCents, // Useful for precision
        },
      },
    },
  });

  if (!result.ok) {
    console.error('Failed to trigger dunning email:', {
      email: params.email,
      eventName,
      status: result.status,
      error: result.error || result.data?.errors,
    });
  }

  return { eventName, ...result };
}
