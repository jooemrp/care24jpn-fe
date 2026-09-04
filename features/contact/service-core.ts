import type { ContactSubmitResult } from "./status-copy";

export const CONTACT_BODY_LIMIT = 16 * 1024;
export const CONTACT_TIMEOUT_MS = 10_000;

export type ContactPayloadValidation =
  | { success: true; data: unknown }
  | { success: false };

export type ContactPayloadValidator = (payload: unknown) => ContactPayloadValidation;

export interface ContactServiceOptions {
  endpoint?: string;
  apiKey?: string;
  origin?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  validatePayload?: ContactPayloadValidator;
}

/**
 * The route handler needs the upstream response body and status for
 * compatibility, while Server Actions only need the stable UI outcome.
 * Keeping both here lets both entry points share one validation and relay
 * implementation.
 */
export interface ContactServiceResult {
  outcome: ContactSubmitResult;
  status: number;
  body: string;
}

function localFailure(status: number, message: string): ContactServiceResult {
  return {
    outcome: "error",
    status,
    body: JSON.stringify({ success: false, message }),
  };
}

export function contactOutcomeForStatus(status: number): ContactSubmitResult {
  if (status === 429) return "rate_limited";
  return status >= 200 && status < 300 ? "success" : "error";
}

/**
 * Validates and relays one raw JSON request body to the allowlisted contact
 * endpoint. Configuration is supplied by the server-only wrapper so this
 * core stays easy to exercise with focused tests.
 */
export async function submitContactRequest(
  rawBody: string,
  {
    endpoint = "",
    apiKey = "",
    origin = "",
    timeoutMs = CONTACT_TIMEOUT_MS,
    fetchImpl = fetch,
    validatePayload,
  }: ContactServiceOptions = {},
): Promise<ContactServiceResult> {
  if (!endpoint || !apiKey || !validatePayload) {
    return localFailure(503, "Contact service is not configured.");
  }

  if (rawBody.length > CONTACT_BODY_LIMIT) {
    return localFailure(413, "Request body too large.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return localFailure(400, "Invalid JSON body.");
  }

  const parsed = validatePayload(payload);
  if (!parsed.success) {
    return localFailure(400, "Invalid request body.");
  }

  try {
    const upstream = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(parsed.data),
      // Contact submissions are visitor-specific and must never be cached.
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    const body = await upstream.text();
    return {
      outcome: contactOutcomeForStatus(upstream.status),
      status: upstream.status,
      body,
    };
  } catch {
    return localFailure(502, "Contact service unavailable, please try again later.");
  }
}

/**
 * Server Action entry point: serialize the structured argument, then run the
 * same cap, JSON, Zod, and upstream policy as the compatibility route.
 */
export async function submitContactPayload(
  payload: unknown,
  options?: ContactServiceOptions,
): Promise<ContactServiceResult> {
  let rawBody: string | undefined;
  try {
    rawBody = JSON.stringify(payload);
  } catch {
    return localFailure(400, "Invalid JSON body.");
  }

  if (rawBody === undefined) {
    return localFailure(400, "Invalid JSON body.");
  }

  return submitContactRequest(rawBody, options);
}
