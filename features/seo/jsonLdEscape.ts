/**
 * Escapes a JSON-LD payload for safe embedding inside a `<script
 * type="application/ld+json">` tag via `dangerouslySetInnerHTML`
 * (components/JsonLd.tsx).
 *
 * `JSON.stringify` does NOT escape `<`, so a CMS-controlled string
 * containing a literal `</script>` breaks out of the script element and
 * becomes live, injected HTML — on every page, since JSON-LD renders from
 * the root layout. Until this migration every value going into
 * `JSON.stringify` there was a hardcoded literal, so the sink was dormant;
 * `legalName`, the whole `address`, and `foundingDate` now come from
 * `company_row`s a dashboard editor can freely type into
 * (features/seo/organization.ts), which wakes it up.
 *
 * `npm run atlas:verify`'s `normalizeHtml` strips every `<script>` tag,
 * contents included, before diffing (scripts/atlas/verify-html-parity.ts) —
 * so that gate cannot see this string at all. This function and
 * jsonLdEscape.test.ts are the only thing standing between a `company_row`
 * edit and a stored HTML injection.
 *
 * Same bootstrapping discipline as features/seo/organization.ts: no
 * cross-module runtime import, no `@/` alias, pure and dependency-free, so
 * `node --test features/seo/jsonLdEscape.test.ts` runs it with no bundler.
 *
 * Escapes the three characters that matter once JSON text is dropped
 * straight into HTML:
 * - `<` -> the JSON escape sequence for U+003C — stops `</script>`,
 *   `<script>`, `<img onerror=...>`, `<!--` from ever appearing literally in
 *   the emitted markup. This one is load-bearing; the other two are defense
 *   in depth.
 * - `>` -> the JSON escape sequence for U+003E — stops a tag from closing
 *   if a bare `<` reaches the page some other way, and closes off a stray
 *   `-->`.
 * - `&` -> the JSON escape sequence for U+0026 — stops an HTML entity
 *   (`&amp;`, `&lt;`, ...) sitting inside the JSON text from being decoded
 *   by the HTML parser before `JSON.parse` ever runs on it.
 *
 * All three are ordinary characters inside a JSON string, and `\uXXXX` is
 * valid JSON string-escape syntax, so this never changes the PARSED value —
 * only the serialized bytes an HTML parser sees before `JSON.parse` runs.
 * `jsonLdEscape.test.ts` asserts the escaped output still round-trips
 * through `JSON.parse` to the exact original value.
 */
export function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
