import { runDunningWorker } from '@/lib/klaviyo/worker';
import { runGiveUpSweep } from '@/lib/dunning/give-up';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Demo shortcut: run the async worker immediately so the injected failure's
 * Klaviyo email goes out without waiting for the cron schedule.
 * Disabled in production — there the cron endpoint owns this.
 */
export async function POST() {
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProduction) {
    return Response.json({ ok: false, error: 'Use the cron endpoint in production' }, { status: 404 });
  }

  const [worker, giveUp] = await Promise.all([runDunningWorker(), runGiveUpSweep()]);
  return Response.json({ ok: true, worker, giveUp });
}
