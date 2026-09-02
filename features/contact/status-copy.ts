/**
 * Pure status-copy lookup for the contact form submission outcomes.
 *
 * DELIBERATELY IMPORT-FREE (no `@/` aliases, no imports at all): that keeps
 * this module loadable under plain `node --test` (status-copy.test.ts) as
 * well as inside Next's bundler. The copy table is passed in (the component
 * passes `contactPage.status`) rather than imported, so this file stays
 * free of path aliases.
 */

export type ContactStatusTable = {
  sending: { ja: string; en: string };
  success: { ja: string; en: string };
  error: { ja: string; en: string };
  rateLimited: { ja: string; en: string };
};

export type ContactSubmitResult = "success" | "error" | "rate_limited";

/**
 * Picks the localized copy for a submission state. The import-free contract
 * returns a string for every reachable state; the caller handles the
 * never-rendered "idle" state before calling.
 */
export function statusCopyFor(
  status: ContactSubmitResult | "sending",
  lang: "ja" | "en",
  table: ContactStatusTable,
): string {
  if (status === "sending") return table.sending[lang];
  if (status === "success") return table.success[lang];
  if (status === "error") return table.error[lang];
  return table.rateLimited[lang];
}
