/**
 * Demo gating flag. The one-click failure simulator is harmless to run in
 * development, but on a production Vercel deployment it should be an explicit
 * opt-in (it writes rows and fires real Klaviyo emails), hence ENABLE_DEMO.
 *
 * The value is parsed leniently so `TRUE`, ` true `, `1`, `yes`, or `on` all
 * count — a trailing space or capitalized letter should never silently disable
 * the demo.
 */

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

/** Truthy-enough demo flag values (trimmed + lowercased). */
export function parseDemoFlag(raw: string | undefined): boolean {
  if (raw == null) return false;
  const value = raw.trim().toLowerCase();
  return ['true', '1', 'yes', 'on', 'enabled', 'y'].includes(value);
}

/** Demo enabled when running locally, or explicitly opted-in in production. */
export function isDemoEnabled(): boolean {
  return !isProductionEnv() || parseDemoFlag(process.env.ENABLE_DEMO);
}
