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

  if (!process.env.KLAVIYO_PRIVATE_API_KEY) {
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

    // Current Events API (v3) — the legacy v1/track endpoint this used to
    // call was retired by Klaviyo on June 30, 2024 and now returns 410.
    const result = await klaviyoClient.post('events', {
      data: {
        type: 'event',
        attributes: {
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
          properties,
        },
      },
    });

    if (result.skipped) {
      return Response.json({ ok: false, error: result.reason }, { status: 500 });
    }

    // ✅ FIXED: Use result.data directly instead of calling .json()
    if (!result.ok) {
      return Response.json(
        { 
          ok: false, 
          error: `Klaviyo returned ${result.status}`, 
          details: result.data || { error: 'No details available' }
        },
        { status: 502 },
      );
    }

    // ✅ FIXED: result.data already contains the parsed response
    // Events API returns 202 Accepted with no body on success.
    const data = result.status === 202 ? null : result.data;
    return Response.json({ ok: true, eventName, email, data });
  } catch (error) {
    console.error('⚠️ Klaviyo test trigger failed:', error instanceof Error ? error.message : error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Klaviyo sync failed' },
      { status: 500 },
    );
  }
}
