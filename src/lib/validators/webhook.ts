/**
 * Structural sanity check for a Stripe-event-shaped payload, used on the
 * unverified local-dev fallback path (no signature/webhook secret) before
 * it's passed to extractFailureFields. This is not a substitute for
 * signature verification — it only guards against obviously malformed
 * bodies (missing type, missing data.object) causing confusing downstream
 * errors.
 */
export function validateWebhookPayload(payload: unknown): payload is {
  type: string;
  data: { object: Record<string, unknown> };
} {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  if (typeof candidate.type !== 'string' || candidate.type.length === 0) {
    return false;
  }

  const data = candidate.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object' || typeof data.object !== 'object' || data.object === null) {
    return false;
  }

  return true;
}
