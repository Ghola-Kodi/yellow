import { getPaymentFailures } from '@/lib/payment-store';
import { getAuthenticatedUser } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const failures = await getPaymentFailures();
  return Response.json({ items: failures });
}
