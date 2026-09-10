import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const WINDOW_MINUTES = 10;
const MAX_PER_IP = 3;
const MAX_PER_EMAIL = 3;

export async function checkSimulatorRateLimit(ipAddress: string, email: string) {
  const supabase = getSupabaseAdminClient();

  // If Supabase isn't configured, don't block the demo — but don't pretend
  // we rate limited it either.
  if (!supabase) {
    return { allowed: true, reason: null as string | null };
  }

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const [{ count: ipCount }, { count: emailCount }] = await Promise.all([
    supabase
      .from('simulator_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', windowStart),
    supabase
      .from('simulator_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', windowStart),
  ]);

  if ((ipCount ?? 0) >= MAX_PER_IP) {
    return { allowed: false, reason: `Too many attempts from this connection. Try again in ${WINDOW_MINUTES} minutes.` };
  }

  if ((emailCount ?? 0) >= MAX_PER_EMAIL) {
    return { allowed: false, reason: `Too many attempts for this email. Try again in ${WINDOW_MINUTES} minutes.` };
  }

  await supabase.from('simulator_attempts').insert({ ip_address: ipAddress, email });

  return { allowed: true, reason: null as string | null };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
