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

/** Built-in bilingual detail copy for known reject reasons (CMS stays generic). */
const DETAIL_COPY: Record<
  Exclude<ContactErrorCode, "rate_limited"> | "rate_limited",
  { ja: string; en: string }
> = {
  too_fast: {
    ja: "送信が早すぎます。数秒待ってからもう一度お試しください。",
    en: "That was too fast. Please wait a few seconds and try again.",
  },
  expired: {
    ja: "フォームの有効期限が切れました。ページを再読み込みしてから送信してください。",
    en: "This form expired. Please reload the page and try again.",
  },
  origin: {
    ja: "このサイトからの送信は許可されていません。公式サイトからお試しください。",
    en: "Submissions from this site are not allowed. Please use the official website.",
  },
  validation: {
    ja: "入力内容に問題があります。内容を確認して再度お試しください。",
    en: "Something in the form looks invalid. Please check your entries and try again.",
  },
  rejected: {
    ja: "送信を受け付けられませんでした。内容を確認して再度お試しください。",
    en: "The submission could not be accepted. Please check your entries and try again.",
  },
  unavailable: {
    ja: "一時的に送信できません。しばらくしてから再度お試しください。",
    en: "The contact service is temporarily unavailable. Please try again shortly.",
  },
  config: {
    ja: "お問い合わせ機能の設定に問題があります。時間をおいて再度お試しください。",
    en: "Contact is misconfigured on this environment. Please try again later.",
  },
  rate_limited: {
    ja: "短時間に送信が多すぎます。しばらくしてから再度お試しください。",
    en: "Too many submissions. Please try again later.",
  },
};

/**
 * Maps a known upstream / local failure into a structured UI result.
 * Only safe, non-secret phrases are classified; everything else stays generic.
 */
export function contactResultFromUpstream(
  httpStatus: number,
  body: string,
): ContactSubmitResult {
  if (httpStatus === 429) {
    return {
      status: "rate_limited",
      code: "rate_limited",
      message: DETAIL_COPY.rate_limited.en,
    };
  }
  if (httpStatus >= 200 && httpStatus < 300) {
    return { status: "success" };
  }

  const raw = extractUpstreamMessage(body);
  const lower = raw.toLowerCase();

  if (
    lower.includes("wait a few seconds") ||
    lower.includes("too quickly") ||
    lower.includes("filled too quickly")
  ) {
    return { status: "error", code: "too_fast", message: DETAIL_COPY.too_fast.en };
  }
  if (lower.includes("expired") || lower.includes("reload the form")) {
    return { status: "error", code: "expired", message: DETAIL_COPY.expired.en };
  }
  if (lower.includes("origin is not allowed") || lower.includes("disallowed origin")) {
    return { status: "error", code: "origin", message: DETAIL_COPY.origin.en };
  }
  if (
    lower.includes("invalid request body") ||
    lower.includes("invalid json") ||
    lower.includes("unknown category") ||
    lower.includes("validation")
  ) {
    return { status: "error", code: "validation", message: DETAIL_COPY.validation.en };
  }
  // Backend honeypot / reserved-field trap — message is intentionally opaque.
  if (lower.includes("invalid submission")) {
    return { status: "error", code: "rejected", message: DETAIL_COPY.rejected.en };
  }
  if (httpStatus === 503 && lower.includes("not configured")) {
    return { status: "error", code: "config", message: DETAIL_COPY.config.en };
  }
  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
    return { status: "error", code: "unavailable", message: DETAIL_COPY.unavailable.en };
  }

  return {
    status: "error",
    code: "rejected",
    message: DETAIL_COPY.rejected.en,
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

/**
 * Picks the localized copy for a submission state. Known reason codes use
 * built-in detail copy; unknown/generic failures fall back to the CMS table.
 */
export function statusCopyFor(
  result: ContactSubmitResult | "sending",
  lang: "ja" | "en",
  table: ContactStatusTable,
): string {
  if (result === "sending") return table.sending[lang];
  if (result.status === "success") return table.success[lang];
  if (result.status === "rate_limited") {
    return DETAIL_COPY.rate_limited[lang] || table.rateLimited[lang];
  }
  const detail = DETAIL_COPY[result.code];
  if (detail) return detail[lang];
  return table.error[lang];
}

/** True when the inline status should render as an error (red). */
export function isContactFailure(result: ContactSubmitResult): boolean {
  return result.status === "error" || result.status === "rate_limited";
}
