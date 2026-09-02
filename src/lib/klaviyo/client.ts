/**
 * Klaviyo Events API client (current API, revisioned — the legacy v1/v2 API
 * including v1/track was retired by Klaviyo on June 30, 2024).
 * https://developers.klaviyo.com/en/reference/create_event
 *
 * ERROR-CAPTURE CONTRACT
 * ----------------------
 * Every failure mode is *captured*, never swallowed:
 *
 *   • Config errors (missing key, malformed revision)      -> result.errorKind = 'not_configured'
 *   • Klaviyo 4xx/5xx responses (with full errors[] body)  -> result.errorKind = 'http'
 *   • Network failures (DNS, TLS, connection refused, …)   -> result.errorKind = 'network'
 *   • Timeouts                                             -> result.errorKind = 'timeout'
 *   • Unparseable / empty response bodies                  -> result.errorKind = 'parse'
 *   • Invalid caller input / payload                       -> result.errorKind = 'validation'
 *
 * Each failure is:
 *   1. logged with full structured context (endpoint, status, code, detail, timing),
 *   2. delivered to every handler registered via setKlaviyoErrorHandler(),
 *   3. returned to the caller as a typed KlaviyoEventResponse.
 *
 * This module never throws for API-level problems — callers should inspect
 * `result.ok` (and `result.errorKind` / `result.errorCode`) instead of
 * relying on try/catch.
 */

export type KlaviyoErrorKind =
  | 'not_configured' // environment/config problem (e.g. missing API key)
  | 'http' // Klaviyo answered with a non-2xx status
  | 'network' // the request never completed (DNS/TLS/socket…)
  | 'timeout' // request aborted because it exceeded KLAVIYO_TIMEOUT_MS
  | 'parse' // response body could not be read or parsed as JSON
  | 'validation'; // caller input or payload was rejected before sending

/** One item of Klaviyo's standard `{"errors": [...]}` error envelope. */
export interface KlaviyoApiIssue {
  id?: string;
  status?: number | string;
  code?: string;
  title?: string;
  detail?: string;
  source?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
}

export interface KlaviyoEventResponse {
  ok: boolean;
  /** HTTP status; 0 when the request was never sent (config skip). */
  status: number;
  statusText?: string;
  /** Broad category — see KlaviyoErrorKind. */
  errorKind?: KlaviyoErrorKind;
  /** Machine-readable code, e.g. CONFIG_MISSING_API_KEY, HTTP_400, KLAVIYO_INVALID_HEADER. */
  errorCode?: string;
  /** Short human-readable summary, safe to surface to logs/APIs. */
  error?: string;
  /** Full captured context: Klaviyo `errors[]`, raw body, response metadata. */
  detail?: unknown;
  /** Parsed JSON response body (success or error payload), when one existed. */
  data?: unknown;
  /** True when the request was intentionally never sent (e.g. missing key). */
  skipped?: boolean;
  /** Human-readable reason for a skipped request. */
  reason?: string;
  /** Requested API path (e.g. "events"). */
  endpoint?: string;
  /** Klaviyo request id from response headers, when present. */
  requestId?: string;
  /** Round-trip time in milliseconds. */
  durationMs?: number;
}

/** Result of triggerDunningEmail — includes the event name that was targeted. */
export type DunningEventResult = KlaviyoEventResponse & { eventName: string };

const KLAVIYO_BASE_URL = 'https://a.klaviyo.com/api';
const DEFAULT_REVISION = '2026-07-15';
const DEFAULT_TIMEOUT_MS = 15_000;
const REVISION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RAW_BODY_LOG = 2_000;

// ---------------------------------------------------------------------------
// Error-handler hook — lets callers forward captured failures anywhere
// (metrics, DB updates, alerting) without changing their call sites.
// ---------------------------------------------------------------------------

type KlaviyoErrorHandler = (result: KlaviyoEventResponse) => void;

// Plain array (not a Set) so this compiles under the repo's ES5 target —
// `for...of` over a Set would require `--downlevelIteration`.
const errorHandlers: KlaviyoErrorHandler[] = [];

/** Register a handler invoked (fire-and-forget) for every failed Klaviyo call. */
export function setKlaviyoErrorHandler(handler: KlaviyoErrorHandler | null): () => void {
  if (handler) {
    errorHandlers.push(handler);
    return () => {
      const index = errorHandlers.indexOf(handler);
      if (index !== -1) {
        errorHandlers.splice(index, 1);
      }
    };
  }
  return () => undefined;
}

function notifyErrorHandlers(result: KlaviyoEventResponse): void {
  // Iterate a copy so a handler that unregisters itself mid-loop is safe.
  errorHandlers.slice().forEach((handler) => {
    try {
      handler(result);
    } catch (handlerError) {
      console.error('⚠️ Klaviyo error handler threw:', handlerError);
    }
  });
}

// ---------------------------------------------------------------------------
// Configuration (resolved per call so late-set env vars / tests are honored)
// ---------------------------------------------------------------------------

interface KlaviyoConfig {
  apiKey: string;
  revision: string;
  timeoutMs: number;
  debug: boolean;
}

function getConfig(): KlaviyoConfig {
  return {
    apiKey: process.env.KLAVIYO_PRIVATE_API_KEY?.trim() ?? '',
    revision: process.env.KLAVIYO_REVISION?.trim() || DEFAULT_REVISION,
    timeoutMs: Number(process.env.KLAVIYO_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    debug: process.env.KLAVIYO_DEBUG === 'true',
  };
}

// ---------------------------------------------------------------------------
// Failure builders
// ---------------------------------------------------------------------------

function fail(result: Partial<KlaviyoEventResponse> & { ok: false }): KlaviyoEventResponse {
  return {
    status: 0,
    skipped: false,
    ...result,
    durationMs: result.durationMs ?? 0,
  };
}

function configFailure(
  code: string,
  reason: string,
  endpoint: string,
): KlaviyoEventResponse {
  const result = fail({
    ok: false,
    status: 0,
    skipped: true,
    errorKind: 'not_configured',
    errorCode: code,
    error: reason,
    reason,
    endpoint,
  });
  logFailure(result);
  notifyErrorHandlers(result);
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, max = MAX_RAW_BODY_LOG): string {
  return text.length > max ? `${text.slice(0, max)}…(truncated)` : text;
}

function summarizeIssues(issues: KlaviyoApiIssue[] | unknown, statusText?: string): string {
  if (Array.isArray(issues) && issues.length > 0) {
    const first = issues[0] ?? {};
    const code = first.code ? ` [${first.code}]` : '';
    const detail = first.detail ? `: ${first.detail}` : '';
    const title = first.title ? `${first.title}` : `Klaviyo error${code}`;
    return `${title}${detail}` || `HTTP ${statusText ?? ''}`.trim();
  }
  return `HTTP ${(statusText ?? '').trim() || 'error'}`;
}

function issueErrorCode(issues: KlaviyoApiIssue[] | unknown, status: number): string {
  if (Array.isArray(issues) && issues.length > 0) {
    const code = issues[0]?.code;
    if (code) {
      return `KLAVIYO_${code.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
    }
  }
  return `HTTP_${status}`;
}

/** Reads the raw body once and tries JSON, so we never lose the raw text. */
async function readBody(response: Response): Promise<{ data?: unknown; rawText: string }> {
  const rawText = await response.text().catch((error: unknown) => {
    console.error('❌ Klaviyo: could not read response body:', error);
    return '';
  });
  if (!rawText) return { rawText: '' };
  try {
    return { data: JSON.parse(rawText) as unknown, rawText };
  } catch {
    return { rawText };
  }
}

function extractIssues(data: unknown): KlaviyoApiIssue[] | unknown {
  if (data && typeof data === 'object' && Array.isArray((data as { errors?: unknown }).errors)) {
    return (data as { errors: KlaviyoApiIssue[] }).errors;
  }
  return data;
}

function logFailure(result: KlaviyoEventResponse): void {
  console.error('❌ Klaviyo call failed', {
    ok: result.ok,
    errorKind: result.errorKind,
    errorCode: result.errorCode,
    error: result.error,
    status: result.status,
    statusText: result.statusText,
    endpoint: result.endpoint,
    requestId: result.requestId,
    durationMs: result.durationMs,
    skipped: result.skipped,
    reason: result.reason,
    detail: result.detail,
  });
}

function logSuccess(result: KlaviyoEventResponse, debug: boolean): void {
  if (!debug) return;
  console.debug('✅ Klaviyo API success:', {
    status: result.status,
    endpoint: result.endpoint,
    requestId: result.requestId,
    durationMs: result.durationMs,
    data: result.data,
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Core request — captures every error mode, never throws.
// ---------------------------------------------------------------------------

async function request(
  method: 'POST',
  path: string,
  body: Record<string, unknown>,
): Promise<KlaviyoEventResponse> {
  const startedAt = Date.now();
  const cleanPath = path.replace(/^\/+/, '');
  const endpoint = `${KLAVIYO_BASE_URL}/${cleanPath}`;

  const base: Partial<KlaviyoEventResponse> = { endpoint, durationMs: 0 };

  // -- config: missing API key ------------------------------------------------
  const config = getConfig();
  if (!config.apiKey) {
    return configFailure(
      'CONFIG_MISSING_API_KEY',
      'KLAVIYO_PRIVATE_API_KEY is not set — Klaviyo call skipped',
      endpoint,
    );
  }

  // -- config: malformed revision (server is the authority on *supported* dates,
  //    but we catch obviously-bad values before wasting a request) -------------
  if (!REVISION_PATTERN.test(config.revision)) {
    const result = fail({
      ...base,
      ok: false,
      status: 0,
      skipped: true,
      errorKind: 'validation',
      errorCode: 'CONFIG_INVALID_REVISION',
      error: `KLAVIYO_REVISION "${config.revision}" is not a valid YYYY-MM-DD date`,
      reason: 'KLAVIYO_REVISION is malformed',
    });
    logFailure(result);
    notifyErrorHandlers(result);
    return result;
  }

  // -- validation: body must serialize ----------------------------------------
  let payload: string;
  try {
    payload = JSON.stringify(body);
  } catch (error) {
    const result = fail({
      ...base,
      ok: false,
      status: 0,
      errorKind: 'validation',
      errorCode: 'INVALID_PAYLOAD',
      error: `Klaviyo payload could not be serialized: ${error instanceof Error ? error.message : String(error)}`,
    });
    logFailure(result);
    notifyErrorHandlers(result);
    return result;
  }

  if (config.debug) {
    console.debug('📤 Klaviyo API Call:', {
      method,
      endpoint,
      revision: config.revision,
      body: payload,
    });
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      endpoint,
      {
        method,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          revision: config.revision,
        },
        body: payload,
      },
      config.timeoutMs,
    );
  } catch (error) {
    // -- network / timeout ------------------------------------------------------
    const timedOut =
      error instanceof Error && error.name === 'AbortError';
    const kind = timedOut ? 'timeout' : 'network';
    const result = fail({
      ...base,
      ok: false,
      status: timedOut ? 408 : 500,
      statusText: timedOut ? 'Request Timeout' : 'Network Error',
      errorKind: kind,
      errorCode: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
      error: timedOut
        ? `Klaviyo request timed out after ${config.timeoutMs}ms`
        : `Network error calling Klaviyo: ${error instanceof Error ? error.message : String(error)}`,
      detail: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
    });
    logFailure(result);
    notifyErrorHandlers(result);
    return result;
  }

  const durationMs = Date.now() - startedAt;
  const requestId = response.headers.get('x-request-id') ?? undefined;
  const resultBase = { ...base, durationMs, requestId };

  // -- parse: read the body defensively ---------------------------------------
  const { data, rawText } = await readBody(response);

  // -- success ----------------------------------------------------------------
  if (response.ok) {
    const result: KlaviyoEventResponse = {
      ...resultBase,
      ok: true,
      status: response.status,
      statusText: response.statusText,
      data,
      // Klaviyo's Events API answers 202 Accepted, often with an empty body —
      // that is success, not a parse error.
      detail: rawText ? extractIssues(data) : undefined,
    };
    logSuccess(result, config.debug);
    return result;
  }

  // -- http: Klaviyo answered with an error ------------------------------------
  const issues = extractIssues(data);
  const result = fail({
    ...resultBase,
    ok: false,
    status: response.status,
    statusText: response.statusText,
    errorKind: 'http',
    errorCode: issueErrorCode(issues, response.status),
    error: summarizeIssues(issues, response.statusText),
    data,
    detail: {
      errors: issues,
      rawBody: truncate(rawText),
      responseHeaders: {
        'x-request-id': requestId,
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') ?? undefined,
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') ?? undefined,
        'x-ratelimit-reset': response.headers.get('x-ratelimit-reset') ?? undefined,
      },
    },
  });
  logFailure(result);
  notifyErrorHandlers(result);
  return result;
}

// ---------------------------------------------------------------------------
// Public client — same surface as before, now with full error capture.
// ---------------------------------------------------------------------------

export const klaviyoClient = {
  post(path: string, body: Record<string, unknown>): Promise<KlaviyoEventResponse> {
    return request('POST', path, body);
  },
};

// ---------------------------------------------------------------------------
// Dunning event names — configure to match your Klaviyo flow trigger metrics.
// ---------------------------------------------------------------------------

const DECLINE_EVENT_NAMES: Record<'soft' | 'hard', string> = {
  soft: process.env.KLAVIYO_SOFT_DECLINE_EVENT ?? 'Payment Failed - Soft Decline',
  hard: process.env.KLAVIYO_HARD_DECLINE_EVENT ?? 'Payment Failed - Hard Decline',
};

/**
 * Fires the dunning event for a declined payment.
 *
 * Never throws: invalid input is returned as a structured `validation`
 * failure so callers can handle every outcome through `result.ok` /
 * `result.errorCode`. Pass a stable `uniqueId` (Stripe event/PaymentIntent id)
 * so Klaviyo deduplicates retries of the same failure.
 */
export async function triggerDunningEmail(params: {
  email: string;
  declineType: 'soft' | 'hard';
  amountCents: number;
  currency: string;
  uniqueId?: string;
}): Promise<DunningEventResult> {
  const startedAt = Date.now();

  // -- validation: capture bad input instead of throwing -----------------------
  const validationError = validateDunningParams(params);
  if (validationError) {
    const result = fail({
      endpoint: 'events',
      durationMs: Date.now() - startedAt,
      ok: false,
      status: 0,
      errorKind: 'validation',
      errorCode: validationError.code,
      error: validationError.message,
      detail: {
        email: params.email,
        declineType: params.declineType,
        amountCents: params.amountCents,
        currency: params.currency,
      },
    });
    logFailure(result);
    notifyErrorHandlers(result);
    return { eventName: '', ...result };
  }

  const eventName = DECLINE_EVENT_NAMES[params.declineType];
  const amountDollars = params.amountCents / 100;

  const result = await klaviyoClient.post('events', {
    data: {
      type: 'event',
      attributes: {
        ...(params.uniqueId ? { unique_id: params.uniqueId } : {}),
        metric: {
          data: {
            type: 'metric',
            attributes: { name: eventName },
          },
        },
        profile: {
          data: {
            type: 'profile',
            attributes: { email: params.email },
          },
        },
        value: amountDollars,
        properties: {
          decline_type: params.declineType,
          amount: amountDollars,
          currency: params.currency,
          amount_cents: params.amountCents,
        },
      },
    },
  });

  return { eventName, ...result };
}

function validateDunningParams(params: {
  email: string;
  declineType: 'soft' | 'hard';
  amountCents: number;
  currency: string;
}): { code: string; message: string } | null {
  if (!params.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email)) {
    return {
      code: 'VALIDATION_EMAIL_REQUIRED',
      message: 'A valid email is required for the Klaviyo dunning event',
    };
  }
  if (params.declineType !== 'soft' && params.declineType !== 'hard') {
    return {
      code: 'VALIDATION_INVALID_DECLINE_TYPE',
      message: `declineType must be "soft" or "hard", got ${String(params.declineType)}`,
    };
  }
  if (!Number.isFinite(params.amountCents) || params.amountCents <= 0) {
    return {
      code: 'VALIDATION_AMOUNT_INVALID',
      message: 'amountCents must be a positive number of cents',
    };
  }
  if (!params.currency || typeof params.currency !== 'string') {
    return {
      code: 'VALIDATION_CURRENCY_REQUIRED',
      message: 'currency is required (e.g. "usd")',
    };
  }
  return null;
}
