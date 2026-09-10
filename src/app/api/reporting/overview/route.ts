import { getOverview } from '@/lib/reporting/queries';

export const runtime = 'nodejs';

export async function GET() {
  const overview = await getOverview();
  if (overview === null) {
    return Response.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }
  return Response.json({ ok: true, overview });
}
