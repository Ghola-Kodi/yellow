/**
 * Diagnostic endpoint — reports the runtime environment Vercel is actually
 * serving (no secret values, only presence booleans + the demo flag).
 *
 * When the simulator reports "Demo disabled", open `/api/health` and paste the
 * JSON back. It shows whether ENABLE_DEMO reached this deployment at all.
 */

import { getAppBaseUrl } from '@/lib/dunning/constants';
import { isDemoEnabled, isProductionEnv, parseDemoFlag } from '@/lib/demo/flag';

export const runtime = 'nodejs';

export async function GET() {
  const enableDemoRaw = process.env.ENABLE_DEMO;

  return Response.json({
    ok: true,
    environment: {
      nodeEnv: process.env.NODE_ENV ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      isProduction: isProductionEnv(),
    },
    demo: {
      enabled: isDemoEnabled(),
      enableDemoRaw: enableDemoRaw ?? null,
      enableDemoParsed: enableDemoRaw == null ? null : parseDemoFlag(enableDemoRaw),
    },
    appUrl: getAppBaseUrl(),
    configured: {
      supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL),
      supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      stripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      klaviyoPrivateKey: Boolean(process.env.KLAVIYO_PRIVATE_API_KEY),
      cronSecret: Boolean(process.env.CRON_SECRET),
    },
  });
}
