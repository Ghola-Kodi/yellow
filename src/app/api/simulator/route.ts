import { createPaymentFailure } from '@/lib/payment-store';
import { checkSimulatorRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const { email, amount, declineType, attemptCount, isTestMode } = payload;

  if (!email || !amount) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  const rateLimit = await checkSimulatorRateLimit(clientIp, email);

  if (!rateLimit.allowed) {
    return Response.json({ error: rateLimit.reason }, { status: 429 });
  }

  const record = await createPaymentFailure({
    id: `sim_${Date.now()}`,
    customer_email: email,
    stripe_customer_id: `cus_sim_${Date.now()}`,
    amount_cents: Number(amount),
    amount: Number(amount),
    currency: 'usd',
    status: 'pending',
    decline_type: declineType ?? 'soft',
    decline_code: declineType === 'hard' ? 'expired_card' : 'insufficient_funds',
    attempt_count: Number(attemptCount ?? 1),
    recovery_status: 'pending',
    klaviyo_flow_status: isTestMode ? 'queued' : 'not_sent',
    metadata: {
      source: 'simulator',
      isTestMode: Boolean(isTestMode),
    },
  });

  return Response.json({
    ok: true,
    id: record.id,
    customer_email: record.customer_email,
    status: record.status,
    amount: record.amount,
    decline_type: record.decline_type,
  });
}
