import { getPaymentFailures } from '@/lib/payment-store';

export async function GET() {
  const failures = await getPaymentFailures();
  return Response.json({ items: failures });
}
