import { injectFailure } from '@/lib/demo/inject';
import { isDemoEnabled } from '@/lib/demo/flag';

export const runtime = 'nodejs';

/** One-click demo: inject a synthetic invoice.payment_failed into the engine. */
export async function POST(request: Request) {
  if (!isDemoEnabled()) {
    return Response.json({ ok: false, error: 'Demo disabled — set ENABLE_DEMO=true to enable' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === 'string' ? body.email : null;
  const declineCode = typeof body?.declineCode === 'string' ? body.declineCode : 'insufficient_funds';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: 'A valid email is required' }, { status: 400 });
  }

  try {
    const result = await injectFailure({
      email,
      declineCode,
      amountCents: Number(body?.amountCents) || 4900,
      attemptCount: Number(body?.attemptCount) || 2,
    });
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Injection failed' },
      { status: 500 },
    );
  }
}
