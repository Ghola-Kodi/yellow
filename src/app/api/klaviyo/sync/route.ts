import { klaviyoClient } from '@/lib/klaviyo/client';

// Manual/demo trigger for exercising the Klaviyo integration without a real
// Stripe event. Intentionally disabled outside development — it accepts an
// arbitrary email + event name in the request body with no auth, which is
// fine for local testing but not something to expose publicly.
export async function POST(request: Request) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProduction) {
    return Response.json({ ok: false, error: 'Not available in production' }, { status: 404 });
  }

  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: 'KLAVIYO_PRIVATE_API_KEY is not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const eventName = body.eventName ?? 'Stripe Payment Failed';
    const email = body.email ?? 'demo@admin.com';
    const properties = {
      ...(body.properties ?? {}),
      flow_name: body.flowName ?? 'payment_recovery_demo',
      decline_type: body.declineType ?? 'soft',
      amount: body.amount ?? 0,
      status: body.status ?? 'pending',
    };

    // Klaviyo v3 Events API (v1/track is legacy)
    const response = await klaviyoClient.post('events/', {
      data: {
        type: 'event',
        attributes: {
          properties,
          metric: {
            data: {
              type: 'metric',
              attributes: { name: eventName },
            },
          },
          profile: {
            data: {
              type: 'profile',
              attributes: {
                email,
                first_name: body.firstName ?? 'Customer',
              },
            },
          },
        },
      },
    }, {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: '2024-10-15',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return Response.json(
        { ok: false, error: `Klaviyo returned ${response.status}`, details: errorBody },
        { status: 502 },
      );
    }

    // Klaviyo's Events endpoint returns 202 with no body on success
    const data = response.status === 202 ? null : await response.json().catch(() => null);

    return Response.json({ ok: true, eventName, email, data });
  } catch (error) {
    console.error('⚠️ Klaviyo test trigger failed:', error instanceof Error ? error.message : error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Klaviyo sync failed' },
      { status: 500 },
    );
  }
}
