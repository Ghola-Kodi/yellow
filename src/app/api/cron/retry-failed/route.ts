// Retry logic for failed payments is not implemented yet — this previously
// returned `{ ok: true }` unconditionally, which looks like a working retry
// job but does nothing. Left as an honest stub, gated behind CRON_SECRET so
// it can't be triggered by an arbitrary public POST once real logic lands
// here (e.g. re-attempting a Stripe PaymentIntent / Invoice and updating the
// corresponding payment_failures row).
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret) {
    return Response.json({ ok: false, error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ ok: true, implemented: false, message: 'Retry logic not yet implemented' });
}
