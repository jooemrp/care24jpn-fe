/**
 * The pure raw-response -> `CmsBlock[]` transform, lifted out of
 * `features/cms/client.ts`.
 *
 * WHY THIS FILE EXISTS AS ITS OWN MODULE. `client.ts` imports `server-only`,
 * `react` and `@latellu/atlas-sdk`, and `server-only` is not a real installed
 * package — Next.js aliases it during the build. So `client.ts` cannot be
 * imported outside the bundler at all, which meant the transform below could
 * not be tested without standing up Next, a network and a live workspace.
 *
 * That mattered more here than anywhere else in `features/cms/`: the
 * empty-in-both-locales rule in `mergeBlockData` is the single behaviour this
 * migration flagged as its #1 risk (an empty-but-present `{ ja: "", en: "" }`
 * is TRUTHY, and three call sites render conditionally on a field's presence),
 * and it was the one behaviour nothing could execute in a test.
 *
 * This module therefore imports NOTHING but types. No `server-only`, no
 * `react`, no `@/` path alias, no SDK — same bootstrapping constraints as
 * `fields.ts`, so `node --test features/cms/merge.test.ts` runs it directly
 * with no bundler and no Atlas connection. Keep it that way: adding a runtime
 * import here silently takes the tests offline.
 *
 * `client.ts` keeps everything that genuinely needs the server: building the
 * SDK client, the fetch, the timeout, the try/catch and the warning dedupe.
 */

import type {
  Bilingual,
  CmsBlock,
  PageMeta,
  ParsedBlockData,
  RawBlockTranslation,
  RawPageResponse,
} from "./types";

/**
 * Safely `JSON.parse`s a block/translation `data` string. `raw.get` hands us
 * these as JSON-encoded strings, not objects — the SDK's own locale-merging
 * resources (`pages.get`, `entries().get`) do the same parse internally and
 * default to `{}` on malformed JSON rather than throwing. We mirror that so
 * one corrupt block never takes down a whole page.
 */
// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Keys already warned about in this process. A SECOND, independent Set from
 * `fields.ts#warnedKeys` (this module cannot import `fields.ts` — the file
 * header above is explicit: "imports NOTHING but types" — so the dedupe
 * mechanics are duplicated rather than shared). Same reasoning as
 * `client.ts#reportedUnexpectedContentSlugs`: pages are fetched `no-store`,
 * so without dedupe a permanent mismatch would log identically forever.
 */
const warnedKeys = new Set<string>();

/** `console.warn`, at most once per `key` per process. Mirrors
 * `fields.ts#warnOnce` exactly — see that file for the tag conventions
 * (`[cms:fallback:failure]` / `[cms:fallback:unexpected-content]` /
 * `[cms:unexpected-content]`) this module reuses below. */
function warnOnce(key: string, message: string): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

export function parseData(raw: string | undefined | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Merges one block's base (ja) data with its EN translation, field by field.
 *
 * Contract (this module cannot see the workspace schema, so it cannot tell a
 * localizable field from a non-localizable one on its own):
 * - Every STRING field becomes `Bilingual | undefined`. For genuinely
 *   localizable fields (heading, body, label, ...) `en` is the real EN copy.
 *   For non-localizable string fields (href, course_key, icon, tone, slug,
 *   tel, ...) there is only ever one value, so `ja === en` — callers that
 *   know a field is single-language (from the block type's field list in
 *   scripts/atlas/schema.ts, the authoritative source per block type) just
 *   read `.ja`.
 * - Every NON-STRING field (number, boolean, null, array, nested object)
 *   passes through unchanged. Atlas never puts non-localizable-by-type
 *   values through translation, and wrapping e.g. `rate_row.customer_price`
 *   in `{ ja, en }` would break `formatYen()`'s `toLocaleString`.
 * - **A field empty in BOTH locales becomes `undefined`, never
 *   `{ ja: "", en: "" }`.** An empty object is truthy — three call sites
 *   (`careCourse.fees[].note`, `rate_row.detail`, `hero.body`) render
 *   conditionally on a field's presence, so a stray empty object silently
 *   changes layout. This is the #1 risk flagged for this migration, and
 *   `merge.test.ts` pins it against all four ja/en emptiness combinations.
 *
 * J2: a MISSING `en` mirrors `ja` on purpose (see this function's block
 * comment above) — for the 7 legal documents in particular, JA text on
 * `/en/*` beats a blank page. What was missing is that it did so SILENTLY:
 * nothing logged when an entire page's content was quietly serving Japanese
 * on the English site.
 * `context` (optional 3rd arg, `"<slug>/<blockType>"`, set by
 * `shapePageBlocks` below) makes that observable — with one deliberate
 * scoping decision:
 *
 * This function CANNOT tell a genuinely-untranslated localizable field
 * (heading, body, label — should have gotten an EN value and didn't) apart
 * from a non-localizable field that legitimately has no translation row EVER
 * (href, icon, tone, course_key, tel, ...) — see this file's own "Contract"
 * note above: every string field is wrapped the same way regardless of which
 * kind it is. Warning per FIELD whenever `en` mirrors `ja` would therefore
 * warn on essentially every block, every render, for fields that are working
 * exactly as designed — which is precisely the kind of guessing-from-shape
 * this codebase already tried once and reversed (see `fields.ts#mapBlocksByType`'s
 * header comment on the field-signature heuristic it replaced).
 *
 * So the warning fires only at the BLOCK level, when `enData` (the block's
 * ENTIRE translation payload) is completely empty — meaning no EN
 * translation row exists for this block at all, not just one field. That is
 * a fact available from the wire with no schema knowledge required, and it
 * is exactly the shape of the H8 legal-document regression (a document
 * translator never created the EN row, so every field on that block mirrors
 * JA at once). Any block that has SOME EN data is assumed to be a normal mix
 * of localizable fields (translated) and non-localizable fields (never
 * translated by design) and stays silent, even though individual fields
 * within it may still be mirroring — narrowing false positives to zero at
 * the cost of not catching a single missed field inside an otherwise
 * translated block. `mirroredFields` lists every non-empty JA field name
 * affected, so the one warning per block still names the field(s), as
 * required.
 */
export function mergeBlockData(
  baseData: Record<string, unknown>,
  enData: Record<string, unknown>,
  context?: string,
): ParsedBlockData {
  const merged: ParsedBlockData = {};
  const mirroredFields: string[] = [];

  for (const key of Object.keys(baseData)) {
    const jaRaw = baseData[key];

    if (typeof jaRaw !== "string") {
      // Non-string field: number/boolean/etc. never carry per-locale text.
      merged[key] = jaRaw;
      continue;
    }

    const enRaw = enData[key];
    const ja = jaRaw;
    const en = typeof enRaw === "string" ? enRaw : ja;

    if (typeof enRaw !== "string" && ja !== "") mirroredFields.push(key);

    merged[key] = ja === "" && en === "" ? undefined : ({ ja, en } satisfies Bilingual);
  }

  // Fields present only in the EN translation (no base value at all) still
  // need a slot — treat the missing ja side as empty rather than dropping
  // the field, so a translation-only value doesn't silently vanish.
  for (const key of Object.keys(enData)) {
    if (key in baseData) continue;
    const enRaw = enData[key];
    if (typeof enRaw !== "string") continue;
    merged[key] = enRaw === "" ? undefined : ({ ja: "", en: enRaw } satisfies Bilingual);
  }

  if (context && mirroredFields.length > 0 && Object.keys(enData).length === 0) {
    warnOnce(
      `mirror:${context}`,
      `[cms:unexpected-content] ${context}: no EN translation row exists for this block at all — field(s) ${mirroredFields.map((f) => JSON.stringify(f)).join(", ")} are serving the JA text on /en/* pages with no visible difference. This is expected, working-as-designed behavior for fields that are never translated by nature (href, icon, tone, ...); if any of the field(s) named above are meant to carry real English copy, add the missing EN translation for this block in the dashboard. This warning only prints once per page+block-type per process.`,
    );
  }

  return merged;
}

export function findEnTranslationData(
  blockId: string,
  translations: RawBlockTranslation[] | undefined,
): Record<string, unknown> {
  const match = translations?.find((t) => t.block_id === blockId && t.locale === "en");
  return parseData(match?.data);
}

/**
 * The whole raw `GET /pages/<slug>` body -> the `CmsBlock[]` a
 * `features/cms/*.ts` loader consumes: parse every stringified `data`, overlay
 * the EN translation per block, and sort by `position`.
 *
 * Returns `null` for a body that isn't a usable page (missing, or `blocks`
 * not an array) so `client.ts` has one uniform "fall back to constants"
 * signal rather than two.
 */
/**
 * Merges one SEO field's ja/en pair. DELIBERATELY NOT the same rule as
 * `mergeBlockData`.
 *
 * `mergeBlockData` mirrors a missing `en` into `ja` because for CONTENT
 * blocks a stray non-localizable string field (href, course_key, icon,
 * tone, tel, ...) has only ever one value on the wire, so `ja === en` is
 * simply correct, and for genuinely localizable content the JA text
 * rendering on an untranslated `/en/*` page beats rendering nothing.
 *
 * SEO metadata has neither excuse. `<title>`/`<meta description>` are
 * ALWAYS meant to differ by locale, and `pageMetadata()` already has a real
 * English fallback for every route (`constants/seo.ts`). Borrowing
 * `mergeBlockData`'s mirror rule here is what shipped the regression this
 * function first guarded against: Atlas has no `seo_translations` "en" row
 * for `pricing`/`fees`/`rates`, mirroring turned that ABSENCE into "en
 * equals ja", and `/en/pricing` rendered a Japanese `<title>`.
 *
 * The fix for THAT regression originally dropped the whole field (both ja
 * AND en) to `undefined` whenever no EN row existed, so `pageMetadata()`
 * fell through to `constants/seo.ts` for both locales. That over-corrected:
 * `pricing`/`fees`/`rates` DO have a real, CMS-authored ja title — an editor
 * changing it in the dashboard saw no effect, because the missing EN row
 * dragged the ja value down with it even though `pageMetadata()` resolves
 * title/description PER LOCALE (`cmsMeta.title?.[lang]`, see
 * features/seo/pageMetadata.ts).
 *
 * So resolution is now per-locale, matching how the field is actually read:
 * - `en` is `undefined` — no EN translation row exists at all, the row
 *   failed to parse, or this field is simply absent from the parsed EN
 *   payload. EN is UNKNOWN, not "same as ja", so the `en` side is always
 *   `""` here (never `ja`'s value) — `pageMetadata()`'s truthy check on
 *   `cmsMeta.<field>.en` then falls through to `constants/seo.ts`'s real
 *   English copy for that locale, same as before. The `ja` side is still
 *   whatever the CMS has, if anything, so a JA-only edit keeps working.
 *   Collapses to `undefined` (not `{ ja: "", en: "" }`) only when ja is ALSO
 *   empty/absent, so a page with no SEO content at all still falls through
 *   entirely on both locales.
 * - `en` is `""` — a translation row exists and this field was explicitly
 *   left empty. Same collapse rule: empty in BOTH locales becomes
 *   `undefined` rather than `{ ja: "", en: "" }` (an empty-but-present
 *   object is truthy).
 * - `en` is a non-empty string — the real EN value, used as-is.
 */
function mergeMetaField(ja: string | undefined, en: string | undefined): Bilingual | undefined {
  const jaValue = typeof ja === "string" ? ja : "";

  if (en === undefined) {
    return jaValue === "" ? undefined : { ja: jaValue, en: "" };
  }

  return jaValue === "" && en === "" ? undefined : { ja: jaValue, en };
}

/**
 * Finds the EN row of `page.seo_translations`, if any, and returns its `seo`
 * field as a plain object.
 *
 * `RawSeoTranslation.seo` is handled defensively for BOTH shapes it can
 * arrive in (see the type's doc comment in ./types for the live evidence):
 * an already-parsed OBJECT (the verified live shape — confirmed against
 * `home`, `company` and `use-case` on the live workspace) is used as-is; a
 * JSON STRING (the documented-but-unobserved shape, kept as a fallback
 * rather than assumed away) is `JSON.parse`d inside a try/catch, mirroring
 * `parseData`'s degrade-to-`{}` behaviour so one malformed SEO translation
 * never takes a page's metadata down. Treating a real object as "must be a
 * string" is exactly the silent-failure mode this guards against: coercing
 * an object into `JSON.parse` throws on `"[object Object]"`, which a naive
 * try/catch would swallow into an empty EN overlay with no signal — this is
 * precisely what happened before this function existed:
 * `getPageMeta("use-case").title.en` silently mirrored `ja` instead of
 * surfacing "Use cases".
 */
function findEnSeoTranslation(
  translations: RawPageResponse["seo_translations"],
): Record<string, unknown> {
  const match = translations?.find((t) => t.locale === "en");
  if (!match?.seo) return {};

  if (typeof match.seo === "object") {
    return Array.isArray(match.seo) ? {} : match.seo;
  }

  try {
    const parsed: unknown = JSON.parse(match.seo);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * The whole raw `GET /pages/<slug>` body -> `PageMeta`, parallel to
 * `shapePageBlocks` above and sharing the same raw fetch (see
 * `client.ts#getRawPage`). Deliberately a SECOND loader over the same raw
 * response rather than a change to `shapePageBlocks`'s return shape (ST-03):
 * widening that return type would have rippled into client.ts, five
 * loaders and six existing tests.
 *
 * IMPORTANT, easy to get backwards: `page.page.seo` is a real OBJECT — do
 * NOT `JSON.parse` it. `page.seo_translations[].seo` — see
 * `findEnSeoTranslation` above; it is handled for both shapes it can arrive
 * in.
 *
 * Returns `null` only when there is no page record at all (mirrors
 * `shapePageBlocks`'s "unusable body" contract, so `client.ts` has one
 * uniform fallback signal). A page that DOES exist but carries no `seo`
 * object is a normal, successful result — every field is simply `undefined`.
 */
export function shapePageMeta(page: RawPageResponse | null | undefined): PageMeta | null {
  if (!page || !page.page) return null;

  const seo = page.page.seo ?? {};
  const enSeo = findEnSeoTranslation(page.seo_translations);

  return {
    title: mergeMetaField(seo.title, asString(enSeo.title)),
    description: mergeMetaField(seo.description, asString(enSeo.description)),
    ogImage: mergeMetaField(seo.og_image, asString(enSeo.og_image)),
    // Deliberately no `canonical` field: `seo.canonical` is parsed nowhere
    // else and `pageMetadata()` (features/seo/pageMetadata.ts) always
    // computes the canonical URL itself via `canonicalPath()` — a
    // CMS-editable canonical is never read. `RawPageRecord.seo.canonical`
    // (features/cms/types.ts) still documents the raw wire field, same as
    // the unread `keywords` field beside it; only the PARSED, unrendered
    // copy of it is removed here. If this ever needs reviving: validate the
    // CMS value as a same-origin path before wiring it into
    // `alternates.canonical` — an unvalidated CMS-editable canonical is an
    // open-redirect-shaped foot-gun.
    updatedAt: page.page.updated_at,
  };
}

export function shapePageBlocks(page: RawPageResponse | null | undefined): CmsBlock[] | null {
  if (!page || !Array.isArray(page.blocks)) return null;

  // Read once outside the loop; every block's mirror-warning context is
  // `"<slug>/<blockType>"`, same shape as the `"home/hero"`-style contexts
  // `fields.ts#pickImage`/`pickNumber` already use. `undefined` (not "") when
  // either half is missing, so `mergeBlockData` skips the warning path
  // entirely rather than logging an unlabeled context.
  const slug = page.page?.slug;

  return page.blocks
    .map((block) => {
      const baseData = parseData(block.data);
      const enData = findEnTranslationData(block.id, page.block_translations);
      const context = slug && block.type ? `${slug}/${block.type}` : undefined;
      return {
        id: block.id,
        // Both identifiers are forwarded on purpose. `type` is the
        // hyphenated content-type SLUG ("nav-item") and is what loaders
        // match on; `blockTypeId` is the same type's UUID and is kept
        // because it is the only stable identifier if a slug is ever
        // renamed on the workspace. `?? ""` rather than a throw: a block
        // with no slug simply matches no declared type, so it is ignored
        // (or, if a page's required type is the missing one, the page
        // falls back with a log) instead of taking the whole render down.
        type: block.type ?? "",
        blockTypeId: block.block_type_id,
        parentId: block.parent_id,
        position: block.position,
        data: mergeBlockData(baseData, enData, context),
      } satisfies CmsBlock;
    })
    .sort((a, b) => a.position - b.position);
}
