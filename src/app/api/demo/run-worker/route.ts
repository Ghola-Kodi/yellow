import { runDunningWorker } from '@/lib/klaviyo/worker';
import { runGiveUpSweep } from '@/lib/dunning/give-up';
import { isDemoEnabled } from '@/lib/demo/flag';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Demo shortcut: run the async worker immediately so the injected failure's
 * Klaviyo email goes out without waiting for the cron schedule.
 * Disabled in production — there the cron endpoint owns this.
 */
export async function POST() {
  if (!isDemoEnabled()) {
    return Response.json({ ok: false, error: 'Demo disabled — set ENABLE_DEMO=true to enable' }, { status: 404 });
  }

  const [worker, giveUp] = await Promise.all([runDunningWorker(), runGiveUpSweep()]);
  return Response.json({ ok: true, worker, giveUp });
}
