/**
 * Cron endpoint for the async dunning worker + give-up sweep + dead-letter
 * replay. Polled by Vercel Cron (or any external scheduler) on a schedule —
 * typically every 5 minutes.
 *
 * Protect it with CRON_SECRET so arbitrary requests can't trigger sends.
 */

import { runDunningWorker } from '@/lib/klaviyo/worker';
import { runGiveUpSweep } from '@/lib/dunning/give-up';
import { replayDeadLetters } from '@/lib/webhook/dead-letter';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // unprotected when no secret is configured (dev)
  const header = request.headers.get('authorization') ?? '';
  if (header === `Bearer ${secret}`) return true;
  // Some schedulers can't set headers — allow a query-param secret as fallback.
  const url = new URL(request.url);
  return url.searchParams.get('secret') === secret;
}

async function handler(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const [worker, giveUp, replay] = await Promise.all([
    runDunningWorker(),
    runGiveUpSweep(),
    replayDeadLetters(),
  ]);

  return Response.json({ ok: true, worker, giveUp, replay });
}

export { handler as GET, handler as POST };
