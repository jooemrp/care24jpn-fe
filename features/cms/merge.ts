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
 *   know a field is single-language (per architecture-plan.json#block_types)
 *   just read `.ja`.
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
 */
export function mergeBlockData(
  baseData: Record<string, unknown>,
  enData: Record<string, unknown>,
): ParsedBlockData {
  const merged: ParsedBlockData = {};

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
export function shapePageBlocks(page: RawPageResponse | null | undefined): CmsBlock[] | null {
  if (!page || !Array.isArray(page.blocks)) return null;

  return page.blocks
    .map((block) => {
      const baseData = parseData(block.data);
      const enData = findEnTranslationData(block.id, page.block_translations);
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
        data: mergeBlockData(baseData, enData),
      } satisfies CmsBlock;
    })
    .sort((a, b) => a.position - b.position);
}
