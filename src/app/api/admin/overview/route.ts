import { getActiveCycles, getSendFailures } from '@/lib/reporting/queries';

export const runtime = 'nodejs';

export async function GET() {
  const [cycles, failures] = await Promise.all([getActiveCycles(), getSendFailures()]);
  return Response.json({ ok: true, cycles, failures });
}
