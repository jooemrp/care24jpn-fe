/**
 * Shared field pickers and block-type mapping for every `features/cms/*.ts`
 * loader.
 *
 * Two responsibilities, both previously copy-pasted per loader:
 *
 * 1. **Field pickers** (`pick`/`pickJa`/`pickBi`/`pickLines`/...) —
 *    `merge.ts#mergeBlockData` cannot see the workspace schema, so every
 *    string field comes back as `Bilingual | undefined` regardless of whether
 *    it is localizable. These narrow that back to the shape
 *    `constants/*.ts` already declares, with a constants fallback per field.
 * 2. **`mapBlocksByType`** — turns a page's flat block list into one group per
 *    block type, so a loader reads `groups["nav-item"]` instead of
 *    destructuring by array index.
 *
 * DELIBERATELY DEPENDENCY-FREE at runtime: no `server-only`, no `react`, no
 * `@/constants/*`, no `./client`. Everything here is a pure function over
 * plain data (the one exception, `warnOnce`, touches only `console`). That is
 * what lets `features/cms/fields.test.ts` run under `node --test` with no
 * bundler and no Atlas connection. Anything needing the Atlas client belongs
 * in `client.ts`; anything needing `constants/*.ts` belongs in a loader.
 */
import type { Bilingual, CmsBlock, CmsBlockTypeId } from "./types";

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Keys already warned about in this process. Deliberately a plain
 * module-level Set, mirroring `client.ts#reportedUnexpectedContentSlugs`:
 * pages are fetched `no-store`, so without dedupe a permanent content
 * mismatch would log identically on every single request.
 */
const warnedKeys = new Set<string>();

/**
 * `console.warn`, at most once per `key` per process.
 *
 * Two log tags exist in this feature and they mean different things — do not
 * add a third:
 * - `[cms:fallback:failure]` (client.ts) — Atlas did not answer.
 * - `[cms:fallback:unexpected-content]` (client.ts#reportUnexpectedContent) —
 *   Atlas answered, but a loader threw the whole page away and served
 *   `constants/*.ts` instead. Loaders call that function directly.
 * - `[cms:unexpected-content]` (this file) — Atlas answered and the page IS
 *   being served from the CMS; only a PART of it was not understood (an extra
 *   block nobody maps, a number that arrived as the wrong type). Same family,
 *   no "fallback:" segment, because the page did not fall back.
 */
export function warnOnce(key: string, message: string): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

// ---------------------------------------------------------------------------
// Field pickers
// ---------------------------------------------------------------------------

/**
 * Narrows a merged field back to `Bilingual`.
 *
 * Checks the TYPE of `ja`/`en`, not merely that the keys exist: a
 * non-localization object that happens to carry `ja`/`en` keys with
 * non-string values used to pass the old key-presence-only test, and then
 * `t(value, lang)` rendered `[object Object]` into the page.
 */
export function pick(data: CmsBlock["data"], key: string): Bilingual | undefined {
  const value = data[key];
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.ja !== "string" || typeof candidate.en !== "string") return undefined;
  return candidate as unknown as Bilingual;
}

/**
 * Warns once when `pickJa`/`pickBi` fall back to their constants value
 * because the field arrived empty in both locales (or malformed — `pick`
 * cannot tell the two apart, same limitation it has always had). Silent when
 * `fallbackPreview` is itself empty: nothing would visibly change, so there
 * is nothing to flag (this is what keeps the very common `?? ""` array-index
 * fallbacks in home.ts/pages.ts/rates.ts quiet).
 *
 * J1: editors CANNOT clear one of these fields — clearing it in the
 * dashboard does not blank the site, it silently resurrects this old
 * build-time text, and there was previously no signal anywhere that this
 * happened. Two options existed:
 *   (a) extend `pickBiOptional`'s "empty is respected" semantics here too, or
 *   (b) keep today's fallback-to-constants default, but make the previously
 *       totally silent case observable.
 * Chose (b). `pickBiOptional` exists for exactly two fields
 * (`home_care_course_fee.note`, `rate_row.detail`) whose ABSENCE is read as
 * meaningful content by a specific call site (`fee.note &&` /
 * `row.detail`'s truthiness splits two render branches) — for those, "empty"
 * is a valid state the UI already understands. Every other field this module
 * exists for is required, load-bearing text (headings, CTAs, labels): an
 * accidentally emptied hero heading rendering as a blank hero is a worse,
 * more silent failure than rendering last-known-good text with a log line
 * attached — and turning (a) into the default would additionally change
 * runtime behaviour project-wide (`home.tsx`/`site.ts`/`pages.ts`/`rates.ts`,
 * none of which are this task's to touch — see the ST-FIX5 scope note) for a
 * problem that, as of writing, has never actually occurred: no live field is
 * empty today, so this warning does not fire against the live workspace and
 * the rendered HTML is unchanged. `context` is OPTIONAL (mirrors
 * `pickNumber`/`pickImage`'s required `context`, but required here would mean
 * threading a slug/block-type string through every call site in
 * features/cms/home.ts, site.ts, pages.ts, rates.ts — none of which this task
 * may edit); omitted, the warning still fires but dedupes only by `key`, so
 * two unrelated blocks sharing a field name (e.g. "heading") share one slot.
 */
function warnTextFallback(key: string, fallbackPreview: string, context?: string): void {
  if (!fallbackPreview) return;
  const label = context ?? key;
  warnOnce(
    `text-fallback:${label}:${key}`,
    `[cms:unexpected-content] ${label}: field "${key}" arrived empty in both locales (or was not a usable ja/en pair) — using the constants/*.ts value ${JSON.stringify(fallbackPreview)} instead. This is indistinguishable from an editor CLEARING the field in the dashboard: clearing it does not make the site blank, it silently keeps showing this old text. Contrast with pickBiOptional's fields (fee.note, rate_row.detail), where an empty value IS respected. This warning only prints once per field per process.`,
  );
}

/** Non-localizable string field — reads `.ja` (== `.en`), falls back to the
 * constants value if the block came back empty in both locales. `context`
 * (optional) labels the fallback warning above — see its doc comment. */
export function pickJa(
  data: CmsBlock["data"],
  key: string,
  fallback: string,
  context?: string,
): string {
  const value = pick(data, key)?.ja;
  if (value) return value;
  warnTextFallback(key, fallback, context);
  return fallback;
}

/** Localizable field — falls back to the constants `Bilingual` wholesale if
 * the block came back empty in both locales (never a stray `{ja:"",en:""}`).
 * `context` (optional) labels the fallback warning above — see its doc
 * comment. */
export function pickBi(
  data: CmsBlock["data"],
  key: string,
  fallback: Bilingual,
  context?: string,
): Bilingual {
  const value = pick(data, key);
  if (value) return value;
  warnTextFallback(key, fallback.ja || fallback.en, context);
  return fallback;
}

/**
 * OPTIONAL localizable field (`home_care_course_fee.note`, `rate_row.detail`)
 * — returns `undefined` as-is when the block has no value, WITHOUT falling
 * back to constants. Presence itself is the content here: `page.tsx` renders
 * a `<dd>` only `{fee.note && ...}` and `CourseRateCard.tsx` splits "timed"
 * rows from "extras" by `row.detail`'s truthiness, so reintroducing a
 * constants fallback would resurrect a value the editor deliberately cleared.
 *
 * This is the ONE place in this file where an editor-cleared field is
 * respected instead of resurrecting constants text — see `warnTextFallback`'s
 * doc comment (J1) for why `pickJa`/`pickBi` do not extend this same
 * treatment to every field.
 */
export function pickBiOptional(data: CmsBlock["data"], key: string): Bilingual | undefined {
  return pick(data, key);
}

function splitLines(value: string): string[] {
  return value === "" ? [] : value.split("\n");
}

/**
 * Splits a `textarea` field's joined-by-`\n` JA/EN pair back into one
 * `Bilingual` per line. Falls back to the whole constants array if the field
 * is absent.
 *
 * Iterates `max(jaLines, enLines)`, not `jaLines`: locking the loop to the JA
 * side silently DROPPED every EN line past the JA line count (an editor with
 * 4 EN bullets and 3 JA bullets never saw the 4th), and an empty JA value
 * collapsed a multi-line EN value to a single line, because `"".split("\n")`
 * is `[""]`, not `[]`. A missing line on either side falls back to the other
 * side's text — never dropped, and never rendered as an empty bullet.
 */
export function pickLines(
  data: CmsBlock["data"],
  key: string,
  fallback: Bilingual[],
): Bilingual[] {
  const bi = pick(data, key);
  if (!bi) return fallback;
  // An entirely empty side has ZERO lines, not one empty line — `"".split("\n")`
  // returns `[""]`, which would render a blank bullet at the top of the list.
  // A blank line INSIDE a value is still preserved.
  const jaLines = splitLines(bi.ja);
  const enLines = splitLines(bi.en);
  const count = Math.max(jaLines.length, enLines.length);
  const lines: Bilingual[] = [];
  for (let i = 0; i < count; i++) {
    const ja = jaLines[i];
    const en = enLines[i];
    lines.push({ ja: ja ?? en ?? "", en: en ?? ja ?? "" });
  }
  return lines;
}

/** Non-localizable `textarea` field (`home_example_case.schedule_times`)
 * split into plain strings, one per line. Falls back to the whole constants
 * array if absent. */
export function pickJaLines(data: CmsBlock["data"], key: string, fallback: string[]): string[] {
  const bi = pick(data, key);
  if (!bi) return fallback;
  return splitLines(bi.ja);
}

/**
 * `number` field (`rate_row.customer_price`, `rate_row.supporter_pay`) —
 * every yen figure on the site comes through here.
 *
 * A well-formed block carries a real JS `number` (`merge.ts#mergeBlockData`
 * passes non-strings through untouched). A numeric STRING (`"3500"`) is also
 * accepted: silently discarding it would show the OLD price from
 * `constants/pricing.ts` on `/pricing` and `/fees` while the dashboard showed
 * the new one, and would broadcast the stale figure in JSON-LD `Offer.price`
 * — a wrong price is worse than a missing one. Anything genuinely
 * unparseable falls back to constants AND warns, so the discrepancy is not
 * silent.
 */
export function pickNumber(
  data: CmsBlock["data"],
  key: string,
  fallback: number,
  context: string,
): number {
  const value = data[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  warnOnce(
    `number:${context}:${key}`,
    `[cms:unexpected-content] ${context}: field "${key}" is not a usable number (got ${JSON.stringify(value)}) — using the constants/pricing.ts amount ${fallback} instead. The page still renders from Atlas; only this figure fell back, so the site and the dashboard may now disagree on a price. This warning only prints once per field per process.`,
  );
  return fallback;
}

/**
 * Absolute `http(s)` URL check, by parsing — not by prefix matching.
 *
 * `new URL()` throws on anything that is not absolute, which is exactly the
 * case that matters here: a raw media UUID (`"01a01e63-687a-79bd-..."`) is a
 * perfectly ordinary string and would sail through a `startsWith("http")`
 * test's inverse just as happily as a `data:`/`javascript:` scheme would sail
 * through nothing at all. Protocol is then checked explicitly, so only
 * `http:`/`https:` — the two `next/image` can fetch — are accepted.
 */
function isHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/**
 * `image` field (`home_hero.image`, `use_case_item.image`, `site_brand.logo`,
 * ...) — returns a URL safe to hand to `next/image`, or `fallback`.
 *
 * What arrives here is a URL, not an id: the delivery API rewrites every media
 * UUID inside a block's `data` into its public S3 URL before responding
 * (`backend/internal/page/usecase/public_get_page.go#expandBlockMedia`). So
 * loaders never call `media.get()` and there is no media cache anywhere in
 * this feature.
 *
 * The reason this function exists at all is that that rewrite is documented
 * **best-effort**: "on error the stored data is returned unchanged". When the
 * media lookup fails, the field still arrives — carrying the RAW UUID. Passing
 * that to `next/image` produces a hard error in dev and a broken `src` in
 * production, i.e. Atlas having a bad minute would break the page rather than
 * degrade it. Anything that is not an absolute `http(s)` URL therefore falls
 * back to the file bundled in `public/images/`, and says so once.
 *
 * An ABSENT field (`undefined`/`null`) is silent: `image` fields are optional
 * in the workspace schema, so "no image chosen" is content, not corruption —
 * same contract as every other picker here. A PRESENT but unusable value
 * warns.
 *
 * Reads `.ja` like `pickJa`: these fields are non-localizable, so
 * `merge.ts#mergeBlockData` wrapped one URL into `{ ja, en }` with both sides
 * equal.
 */
export function pickImage(
  data: CmsBlock["data"],
  key: string,
  fallback: string,
  context: string,
): string {
  const value = data[key];
  // Absent, or empty in both locales — `mergeBlockData` collapses `""`/`""`
  // to `undefined`, which is how a cleared image field reaches us.
  if (value === undefined || value === null) return fallback;

  const merged = pick(data, key);
  const url = merged ? merged.ja : value;
  if (typeof url === "string" && isHttpUrl(url)) return url;

  warnOnce(
    `image:${context}:${key}`,
    `[cms:unexpected-content] ${context}: field "${key}" is not a usable image URL (got ${JSON.stringify(value)}) — using the bundled file ${fallback ? `"${fallback}"` : "(none)"} instead. Atlas normally expands an image field's media id into a public URL on the way out; a raw UUID here means that best-effort expansion did not run for this block. The page still renders from Atlas — only this one image is the file shipped in public/images/, so it may not be the one selected in the dashboard. This warning only prints once per field per process.`,
  );
  return fallback;
}

// ---------------------------------------------------------------------------
// Block-type mapping
//
// A block's type is READ, not inferred. `GET /pages/:slug` returns every block
// with its content type's hyphenated slug in a `type` field
// (`id, page_id, block_type_id, position, data, type`), and
// `client.ts#fetchPageBlocks` forwards it as `CmsBlock.type`.
//
// Note it is `type` and NOT `blockTypeId` that is matched here: `block_type_id`
// is the content type's UUID (`01a01d67-77d2-7bb7-...`), which
// `scripts/atlas/seed-*.ts` fills from `getContentType(...).id`, so comparing
// it to a schema slug would never match.
//
// This replaced an earlier field-signature heuristic that guessed a block's
// type from the set of field names it carried. That heuristic could not tell
// `nav-item` from `footer-legal-link` on merit — both carry `href` + `label` —
// so the winner came down to declaration order, which is exactly the silent
// mis-render the mapping exists to prevent. Reading the slug removes the
// guess, and with it the hand-copied field lists that used to shadow
// `scripts/atlas/schema.ts`.
// ---------------------------------------------------------------------------

/**
 * The block types one page is built from, as a list of content-type slugs.
 *
 * Typed `readonly CmsBlockTypeId[]` (`keyof AtlasContentTypes`, generated by
 * `npm run atlas:types`), which is the compile-time half of the contract: a
 * typo (`"nav_item"`) or a content type deleted from the workspace fails
 * `tsc` at the declaration, instead of silently never matching a block and
 * reverting the page to `constants/*.ts` at runtime.
 *
 * Declare each list with `as const satisfies BlockTypeList` so the literal
 * slugs survive into `BlockGroups` and `groups["nav-tem"]` is also an error.
 */
export type BlockTypeList = readonly CmsBlockTypeId[];

/** The result of `mapBlocksByType`: one non-empty, position-sorted list of
 * blocks per declared slug. Keys are the literal slugs passed in. */
export type BlockGroups<S extends BlockTypeList> = {
  readonly [K in S[number]]: CmsBlock[];
};

function groupBySlug(blocks: readonly CmsBlock[]): Map<string, CmsBlock[]> {
  const groups = new Map<string, CmsBlock[]>();

  for (const block of blocks) {
    const existing = groups.get(block.type);
    if (existing) existing.push(block);
    else groups.set(block.type, [block]);
  }

  // `client.ts` already sorts a page's blocks by position and grouping keeps
  // that order, but sorting here makes "items render in dashboard order" a
  // property of this function rather than of its caller.
  for (const group of groups.values()) group.sort((a, b) => a.position - b.position);

  return groups;
}

function describeGroups(groups: Iterable<[string, CmsBlock[]]>): string {
  const parts: string[] = [];
  for (const [slug, blocks] of groups) {
    const fields = new Set<string>();
    for (const block of blocks) for (const key of Object.keys(block.data)) fields.add(key);
    parts.push(
      `${slug || "(block with no type slug)"} (x${blocks.length}, fields: ${[...fields].sort().join("/") || "none"})`,
    );
  }
  return parts.join(", ");
}

/**
 * Maps a page's blocks onto the block types it is built from, by content-type
 * slug — NOT by array index, and NOT by guessing from field names.
 *
 * Consequences, both deliberate:
 * - A repeated type may have ANY number of blocks. Adding a 5th nav item in
 *   the dashboard renders 5 nav items; it no longer reverts the entire header,
 *   footer and brand to `constants/copy.ts`.
 * - Blocks of a type this page does not declare are IGNORED (with one warning
 *   per page per process), not treated as corruption.
 * - Two types that carry identical fields stay distinct, because nothing here
 *   looks at fields. A `footer-legal-link` dragged above a `nav-item` is
 *   still a legal link.
 *
 * Returns `null` — after calling `reportFallback`, which is
 * `client.ts#reportUnexpectedContent` — only when a declared type has no
 * matching block at all. That is the one case where the page genuinely cannot
 * be assembled and the caller must serve `constants/*.ts`.
 */
export function mapBlocksByType<S extends BlockTypeList>(
  slug: string,
  blocks: readonly CmsBlock[],
  types: S,
  reportFallback: (slug: string, detail: string) => void,
): BlockGroups<S> | null {
  const groups = groupBySlug(blocks);

  // `Object.create(null)`, not `{}`: a group is looked up by a slug that came
  // off the wire, and an inherited `constructor`/`toString` would otherwise
  // read as an already-claimed type.
  const assigned = Object.create(null) as Record<string, CmsBlock[]>;
  const declared = new Set<string>(types);
  const missing: string[] = [];

  for (const type of types) {
    const group = groups.get(type);
    if (!group || group.length === 0) {
      missing.push(type);
      continue;
    }
    assigned[type] = group;
  }

  if (missing.length > 0) {
    reportFallback(
      slug,
      `missing required block type(s) [${missing.join(", ")}]; received ${blocks.length} block(s) in ${groups.size} type group(s): ${describeGroups(groups) || "none"}`,
    );
    return null;
  }

  const ignored = [...groups].filter(([type]) => !declared.has(type));
  if (ignored.length > 0) {
    const ignoredCount = ignored.reduce((sum, [, group]) => sum + group.length, 0);
    warnOnce(
      `ignored-blocks:${slug}`,
      `[cms:unexpected-content] page "${slug}" returned ${ignoredCount} block(s) of ${ignored.length} type(s) that no loader maps — they are IGNORED and the rest of the page still renders from Atlas: ${describeGroups(ignored)}. Either the block was added to the page in the dashboard without a loader change, or the loader's block-type list in features/cms/*.ts is out of date. This warning only prints once per page per process.`,
    );
  }

  return assigned as BlockGroups<S>;
}
