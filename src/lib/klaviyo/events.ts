/**
 * Klaviyo Events API v3 payload builder + sender.
 * The legacy v1/v2 `track` endpoint was retired June 30, 2024 — everything
 * here uses the current Events API shape.
 */

import { klaviyoClient, type KlaviyoEventResponse } from './client';

export interface KlaviyoEventInput {
  email: string;
  eventName: string;
  properties: Record<string, unknown>;
  /** Stable id (invoice id) so Klaviyo deduplicates retries. */
  uniqueId?: string;
  /** Optional numeric value (dollars) attached to the metric. */
  value?: number;
}

export async function sendKlaviyoEvent(
  input: KlaviyoEventInput,
): Promise<KlaviyoEventResponse> {
  const { email, eventName, properties, uniqueId, value } = input;

  return klaviyoClient.post('events', {
    data: {
      type: 'event',
      attributes: {
        ...(uniqueId ? { unique_id: uniqueId } : {}),
        metric: {
          data: { type: 'metric', attributes: { name: eventName } },
        },
        profile: {
          data: { type: 'profile', attributes: { email } },
        },
        ...(typeof value === 'number' ? { value } : {}),
        properties,
      },
    },
  });
}

/** Parse Klaviyo's Retry-After header (seconds) from a captured error response. */
export function parseRetryAfterMs(response: KlaviyoEventResponse): number | null {
  const detail = response.detail as
    | { responseHeaders?: Record<string, string | undefined> }
    | undefined;
  const raw = detail?.responseHeaders?.['retry-after'];
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  const date = Date.parse(raw);
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }
  return null;
}
