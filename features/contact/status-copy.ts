/**
 * Pure status-copy lookup for the contact form submission outcomes.
 *
 * DELIBERATELY IMPORT-FREE (no `@/` aliases, no imports at all): that keeps
 * this module loadable under plain `node --test` (status-copy.test.ts) as
 * well as inside Next's bundler. The copy table is passed in (the component
 * passes the CMS-provided status table rather than importing it, so this file stays
 * free of path aliases.
 */

export type ContactStatusTable = {
  sending: { ja: string; en: string };
  success: { ja: string; en: string };
  error: { ja: string; en: string };
  rateLimited: { ja: string; en: string };
};

/** Stable reason codes surfaced by the Server Action (never secrets). */
export type ContactErrorCode =
  | "too_fast"
  | "expired"
  | "origin"
  | "validation"
  | "rejected"
  | "unavailable"
  | "config"
  | "rate_limited";

/**
 * Structured submission outcome. Server Actions return this object (not a bare
 * `"error"` string) so the Network tab and UI can show *why* it failed.
 */
export type ContactSubmitResult =
  | { status: "success" }
  | { status: "rate_limited"; code: "rate_limited"; message: string }
  | { status: "error"; code: Exclude<ContactErrorCode, "rate_limited">; message: string };

/**
 * Maps a known upstream / local failure into a structured UI result.
 * Only safe, non-secret reason codes are classified; user-facing copy stays
 * in the CMS-backed status table rather than being bundled here.
 */
export function contactResultFromUpstream(
  httpStatus: number,
  body: string,
): ContactSubmitResult {
  if (httpStatus === 429) {
    return {
      status: "rate_limited",
      code: "rate_limited",
      message: extractUpstreamMessage(body),
    };
  }
  if (httpStatus >= 200 && httpStatus < 300) {
    return { status: "success" };
  }

  const upstreamCode = extractUpstreamCode(body);
  if (upstreamCode && upstreamCode !== "rate_limited") {
    return { status: "error", code: upstreamCode, message: extractUpstreamMessage(body) };
  }

  const raw = extractUpstreamMessage(body);
  const lower = raw.toLowerCase();

  if (
    lower.includes("wait a few seconds") ||
    lower.includes("too quickly") ||
    lower.includes("filled too quickly")
  ) {
    return { status: "error", code: "too_fast", message: raw };
  }
  if (lower.includes("expired") || lower.includes("reload the form")) {
    return { status: "error", code: "expired", message: raw };
  }
  if (lower.includes("origin is not allowed") || lower.includes("disallowed origin")) {
    return { status: "error", code: "origin", message: raw };
  }
  if (
    lower.includes("invalid request body") ||
    lower.includes("invalid json") ||
    lower.includes("unknown category") ||
    lower.includes("validation")
  ) {
    return { status: "error", code: "validation", message: raw };
  }
  // Backend honeypot / reserved-field trap — message is intentionally opaque.
  if (lower.includes("invalid submission")) {
    return { status: "error", code: "rejected", message: raw };
  }
  if (httpStatus === 503 && lower.includes("not configured")) {
    return { status: "error", code: "config", message: raw };
  }
  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
    return { status: "error", code: "unavailable", message: raw };
  }

  return {
    status: "error",
    code: "rejected",
    message: raw,
  };
}

/** Best-effort parse of `{ message: string }` from upstream / local JSON bodies. */
export function extractUpstreamMessage(body: string): string {
  if (!body) return "";
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    // Non-JSON upstream bodies are ignored for classification.
  }
  return "";
}

/** Read only the stable machine code; user-facing copy never comes from it. */
function extractUpstreamCode(body: string): Exclude<ContactErrorCode, "rate_limited"> | "rate_limited" | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { code?: unknown };
    if (
      parsed.code === "too_fast" ||
      parsed.code === "expired" ||
      parsed.code === "origin" ||
      parsed.code === "validation" ||
      parsed.code === "rejected" ||
      parsed.code === "unavailable" ||
      parsed.code === "config" ||
      parsed.code === "rate_limited"
    ) {
      return parsed.code;
    }
  } catch {
    // Non-JSON upstream bodies are ignored for classification.
  }
  return null;
}

/**
 * Picks the localized copy for a submission state. Every user-facing phrase
 * comes from the CMS-backed contact status table; reason codes are for
 * diagnostics only.
 */
export function statusCopyFor(
  result: ContactSubmitResult | "sending",
  lang: "ja" | "en",
  table: ContactStatusTable,
): string {
  if (result === "sending") return table.sending[lang];
  if (result.status === "success") return table.success[lang];
  if (result.status === "rate_limited") return table.rateLimited[lang];
  return table.error[lang];
}

/** True when the inline status should render as an error (red). */
export function isContactFailure(result: ContactSubmitResult): boolean {
  return result.status === "error" || result.status === "rate_limited";
}
