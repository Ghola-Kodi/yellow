import { getRecentFeed } from '@/lib/reporting/queries';

export const runtime = 'nodejs';

export async function GET() {
  const events = await getRecentFeed(40);
  return Response.json({ ok: true, events });
}
