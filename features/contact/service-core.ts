import {
  contactResultFromUpstream,
  type ContactSubmitResult,
} from "./status-copy";

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
  const body = JSON.stringify({ success: false, message });
  return {
    outcome: contactResultFromUpstream(status, body),
    status,
    body,
  };
}

/**
 * Validates and relays one raw JSON request body to the allowlisted contact
 * endpoint. Configuration is supplied by the server-only wrapper so this
 * core stays easy to exercise with focused tests.
 */
function contactEndpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host || "(invalid-url)";
  } catch {
    return endpoint ? "(unparseable-url)" : "(empty)";
  }
}

function formLoadDiagnostics(payload: unknown): {
  formLoadAt: number | null;
  formLoadAgeMs: number | null;
} {
  if (!payload || typeof payload !== "object") {
    return { formLoadAt: null, formLoadAgeMs: null };
  }
  const value = (payload as { form_load_at?: unknown }).form_load_at;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { formLoadAt: null, formLoadAgeMs: null };
  }
  return { formLoadAt: value, formLoadAgeMs: Date.now() - value };
}

/** Log honeypot fill state without dumping full autofill values. */
function honeypotDiagnostics(payload: unknown): {
  companyLen: number;
  companyNameLen: number;
  companyPreview: string;
} {
  if (!payload || typeof payload !== "object") {
    return { companyLen: 0, companyNameLen: 0, companyPreview: "" };
  }
  const row = payload as { company?: unknown; company_name?: unknown };
  const company = typeof row.company === "string" ? row.company : "";
  const companyName = typeof row.company_name === "string" ? row.company_name : "";
  return {
    companyLen: company.length,
    companyNameLen: companyName.length,
    companyPreview: company ? `${company.slice(0, 24)}${company.length > 24 ? "…" : ""}` : "",
  };
}

function redactUpstreamBody(body: string): string {
  // Never log API keys / Authorization if upstream echoes them.
  return body
    .replace(/(api[_-]?key|authorization|x-api-key)\s*[:=]\s*["']?[^"',}\s]+/gi, "$1=***")
    .slice(0, 500);
}

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
  const endpointHost = contactEndpointHost(endpoint);

  if (!endpoint || !apiKey || !validatePayload) {
    const failure = localFailure(503, "Contact service is not configured.");
    console.error("[contact] submit blocked: missing config", {
      endpointHost,
      hasEndpoint: Boolean(endpoint),
      hasApiKey: Boolean(apiKey),
      hasValidator: Boolean(validatePayload),
      origin: origin || "(empty)",
      mappedOutcome: failure.outcome,
    });
    return failure;
  }

  if (rawBody.length > CONTACT_BODY_LIMIT) {
    const failure = localFailure(413, "Request body too large.");
    console.error("[contact] submit blocked: body too large", {
      endpointHost,
      bodyBytes: rawBody.length,
      limit: CONTACT_BODY_LIMIT,
      origin: origin || "(empty)",
      mappedOutcome: failure.outcome,
    });
    return failure;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    const failure = localFailure(400, "Invalid JSON body.");
    console.error("[contact] submit blocked: invalid JSON", {
      endpointHost,
      origin: origin || "(empty)",
      mappedOutcome: failure.outcome,
    });
    return failure;
  }

  const { formLoadAt, formLoadAgeMs } = formLoadDiagnostics(payload);
  const honeypot = honeypotDiagnostics(payload);

  const parsed = validatePayload(payload);
  if (!parsed.success) {
    const failure = localFailure(400, "Invalid request body.");
    console.error("[contact] submit blocked: schema validation", {
      endpointHost,
      origin: origin || "(empty)",
      formLoadAt,
      formLoadAgeMs,
      ...honeypot,
      mappedOutcome: failure.outcome,
    });
    return failure;
  }

  const outboundHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    ...(origin ? { Origin: origin } : {}),
  };

  console.info("[contact] submit outbound", {
    endpointHost,
    origin: origin || "(empty)",
    outboundOrigin: outboundHeaders.Origin ?? "(not-set)",
    outboundReferer: outboundHeaders.Referer ?? "(not-set)",
    formLoadAt,
    formLoadAgeMs,
    ...honeypot,
  });

  try {
    const upstream = await fetchImpl(endpoint, {
      method: "POST",
      headers: outboundHeaders,
      body: JSON.stringify(parsed.data),
      // Contact submissions are visitor-specific and must never be cached.
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    const body = await upstream.text();
    const outcome = contactResultFromUpstream(upstream.status, body);
    const logPayload = {
      endpointHost,
      origin: origin || "(empty)",
      outboundOrigin: outboundHeaders.Origin ?? "(not-set)",
      formLoadAt,
      formLoadAgeMs,
      ...honeypot,
      upstreamStatus: upstream.status,
      upstreamBody: redactUpstreamBody(body),
      mappedOutcome: outcome,
      mappedWhy:
        outcome.status === "success"
          ? "upstream 2xx"
          : `mapped from status=${upstream.status} body message → code=${"code" in outcome ? outcome.code : "n/a"}`,
    };
    if (outcome.status !== "success") {
      // Surface enough to diagnose allowlist / timing / SMTP without leaking
      // credentials. Server Action returns structured code+message to the UI.
      console.error("[contact] upstream non-success", logPayload);
    } else {
      console.info("[contact] upstream success", logPayload);
    }
    return {
      outcome,
      status: upstream.status,
      body,
    };
  } catch (err) {
    const failure = localFailure(502, "Contact service unavailable, please try again later.");
    console.error("[contact] upstream request failed", {
      endpointHost,
      origin: origin || "(empty)",
      formLoadAt,
      formLoadAgeMs,
      error: err instanceof Error ? err.message : "unknown",
      mappedOutcome: failure.outcome,
      mappedWhy: "fetch threw before usable upstream response",
    });
    return failure;
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
