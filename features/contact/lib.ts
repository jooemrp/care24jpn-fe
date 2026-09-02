/**
 * Client helper for the public contact form flow.
 *
 * Responsibilities:
 *  - `ContactPayload` — inferred from `./schema` (Zod); mirrors the backend
 *    contact DTO (backend/internal/contact/dto/contact.go).
 *  - `submitContact` — POSTs to the same-origin proxy (app/api/contact),
 *    which appends the server-side Atlas delivery key and relays to the
 *    backend's public contact endpoint. Returns a stable status for the UI;
 *    the proxy preserves the backend status so a 429 maps to a distinct
 *    message.
 *
 * This module may be imported from a client component ("use client"); it is
 * plain TS with no server-only imports. (The status copy lookup lives in
 * ./status-copy.ts — import-free — so it can be unit-tested under plain
 * `node` without path aliases.)
 */
import { contactPage } from "@/constants/contact";
import type { Lang } from "@/features/lang/i18n";
import type { ContactPayload } from "./schema";
import { statusCopyFor as pureStatusCopyFor, type ContactSubmitResult } from "./status-copy";

export type { ContactSubmitResult } from "./status-copy";
export type { ContactPayload };

/**
 * POSTs the submission to the same-origin proxy. Returns a stable status for
 * the UI; the proxy preserves the backend status so a 429 maps to a distinct
 * message ("too many submissions").
 */
export async function submitContact(payload: ContactPayload): Promise<ContactSubmitResult> {
  let response: Response;
  try {
    response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // The backend caps the body at 16 KiB and rate-limits per IP/email.
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return "error";
  }

  if (response.status === 429) return "rate_limited";
  return response.ok ? "success" : "error";
}

/**
 * Picks the localized status copy for the current submission outcome, backed
 * by `contactPage.status` (constants/contact.ts — the single source of the
 * bilingual copy). "idle" (nothing rendered yet) maps to null via the caller.
 */
export function statusCopyFor(
  status: ContactSubmitResult | "sending",
  lang: Lang,
): string {
  return pureStatusCopyFor(status, lang, contactPage.status);
}