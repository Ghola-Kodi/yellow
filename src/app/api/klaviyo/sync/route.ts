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

    // klaviyoClient.post injects Authorization internally from
    // KLAVIYO_PRIVATE_API_KEY — no token needed in the body, and no third
    // args (headers) are supported by this client, so this stays on the
    // legacy v1/track endpoint like triggerDunningEmail does.
    const result = await klaviyoClient.post('v1/track', {
      event: eventName,
      customer_properties: {
        $email: email,
        $first_name: body.firstName ?? 'Customer',
      },
      properties,
    });

    if (result.skipped) {
      return Response.json({ ok: false, error: result.reason }, { status: 500 });
    }

    if (!result.ok) {
      const details = await result.json?.().catch(() => null);
      return Response.json(
        { ok: false, error: `Klaviyo returned ${result.status}`, details },
        { status: 502 },
      );
    }

    const data = await result.json?.().catch(() => null);
    return Response.json({ ok: true, eventName, email, data });
  } catch (error) {
    console.error('⚠️ Klaviyo test trigger failed:', error instanceof Error ? error.message : error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Klaviyo sync failed' },
      { status: 500 },
    );
  }
}
