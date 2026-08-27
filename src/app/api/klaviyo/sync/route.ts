import { klaviyoClient } from '@/lib/klaviyo/client';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    const eventName = body.eventName ?? 'Stripe Payment Failed';
    const email = body.email ?? 'demo@admin.cpm';
    const properties = {
      ...(body.properties ?? {}),
      flow_name: body.flowName ?? 'payment_recovery_demo',
      decline_type: body.declineType ?? 'soft',
      amount: body.amount ?? 0,
      status: body.status ?? 'pending',
    };

    const response = await klaviyoClient.post('v1/track', {
      token: process.env.KLAVIYO_PRIVATE_API_KEY ?? process.env.NEXT_PUBLIC_KLAVIYO_API_KEY ?? 'pk_Y9LFtc_c4357fbf797a62da75db987ffa4ef90be3',
      event: eventName,
      customer_properties: {
        $email: email,
        $first_name: body.firstName ?? 'Customer',
      },
      properties,
    });

    // Fix: Use optional chaining to safely call json()
    const data = await response.json?.() ?? {};

    return Response.json({ ok: true, eventName, email, data });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Klaviyo sync failed' }, { status: 500 });
  }
}
