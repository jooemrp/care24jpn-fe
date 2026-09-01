/**
 * Shared field pickers and block-type mapping for every `features/cms/*.ts`
 * loader.
 *
 * Two responsibilities, both previously copy-pasted per loader:
 *
 * 1. **Field pickers** (`pick`/`pickJa`/`pickBi`/`pickLines`/...) —
 *    `merge.ts#mergeBlockData` cannot see the workspace schema, so every
 *    string field comes back as `Bilingual | undefined` regardless of whether
 *    it is localizable. These narrow that back to the shapes `constants/*.ts`
 *    used to declare — WITHOUT any fallback. The CMS is the single source of
 *    truth: an empty/unusable field renders as empty (or is omitted), never
 *    as stale text smuggled in from a constants layer.
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
 *   Atlas answered, but a loader threw the whole page away.
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
 * Non-localizable string field — reads `.ja` (== `.en`). Returns `""` when
 * the field arrived empty or malformed. NO constants fallback: an empty CMS
 * field renders as an empty string, exactly as the dashboard holds it.
 */
export function pickJa(data: CmsBlock["data"], key: string): string {
  return pick(data, key)?.ja ?? "";
}

/**
 * Localizable field — returns the CMS `Bilingual`, or `{ ja: "", en: "" }`
 * when the block came back empty in both locales. NO constants fallback; an
 * empty value is respected (renders as empty) rather than resurrecting stale
 * text.
 */
export function pickBi(data: CmsBlock["data"], key: string): Bilingual {
  return pick(data, key) ?? { ja: "", en: "" };
}

/**
 * Optional localizable field — returns `undefined` when the block has no
 * value, without inventing one. Presence is the content. Callers that render
 * conditionally on a field's presence (`fee.note && ...`) keep working.
 */
export function pickBiOptional(data: CmsBlock["data"], key: string): Bilingual | undefined {
  return pick(data, key);
}

function splitLines(value: string): string[] {
  return value === "" ? [] : value.split("\n");
}

/**
 * Splits a `textarea` field's joined-by-`\n` JA/EN pair back into one
 * `Bilingual` per line. Returns `[]` when the field is absent.
 *
 * Iterates `max(jaLines, enLines)`, not `jaLines`: locking the loop to the JA
 * side silently DROPS every EN line past the JA line count. A blank line
 * INSIDE a value is still preserved; a wholly empty side has zero lines.
 */
export function pickLines(data: CmsBlock["data"], key: string): Bilingual[] {
  const bi = pick(data, key);
  if (!bi) return [];
  const jaLines = splitLines(bi.ja);
  const enLines = splitLines(bi.en);
  const count = Math.max(jaLines.length, enLines.length);
  const lines: Bilingual[] = [];
  for (let i = 0; i < count; i++) {
    const ja = jaLines[i];
    const en = enLines[i];
    lines.push({ ja: ja ?? "", en: en ?? "" });
  }
  return lines;
}

/**
 * Non-localizable `textarea` field split into plain strings, one per line.
 * Returns `[]` when absent.
 */
export function pickJaLines(data: CmsBlock["data"], key: string): string[] {
  const bi = pick(data, key);
  if (!bi) return [];
  return splitLines(bi.ja);
}

/**
 * `number` field (`rate_row.customer_price`, `rate_row.supporter_pay`) —
 * every yen figure on the site comes through here.
 *
 * A well-formed block carries a real JS `number` (non-strings pass through
 * `merge.ts#mergeBlockData` untouched). A numeric STRING (`"3500"`) is also
 * accepted. Anything genuinely unparseable returns `NaN`, logs, and therefore
 * renders as an invalid figure in an obvious way rather than silently
 * substituting a stale constants amount. NO fallback to constants.
 */
export function pickNumber(
  data: CmsBlock["data"],
  key: string,
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
    `[cms:unexpected-content] ${context}: field "${key}" is not a usable number (got ${JSON.stringify(value)}) — rendering it as NaN rather than substituting a constants amount. Fix the field in the dashboard. This warning only prints once per process.`,
  );
  return NaN;
}

/**
 * Absolute `http(s)` URL check, by parsing — not by prefix matching.
 *
 * `new URL()` throws on anything that is not absolute, which is exactly the
 * case that matters here: a raw media UUID is a perfectly ordinary string and
 * would sail through a `startsWith("http")` test's inverse. Protocol is then
 * checked explicitly, so only `http:`/`https:` — the two `next/image` can
 * fetch — are accepted.
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
 * `image` field — returns a URL safe to hand to `next/image`, or `""`.
 *
 * What arrives here is a URL, not an id: the delivery API rewrites every media
 * UUID inside a block's `data` into its public S3 URL before responding. When
 * that rewrite is best-effort and fails, the field still arrives carrying the
 * RAW UUID — passing that to `next/image` is a hard error in dev. Anything
 * that is not an absolute `http(s)` URL returns `""` (no image), with a
 * warning. NO fallback to bundled `public/images/*` files.
 *
 * An ABSENT field is silent: `image` fields are optional, so "no image
 * chosen" renders as no image. Reads `.ja` like `pickJa`: non-localizable,
 * so both merged sides are equal.
 */
export function pickImage(
  data: CmsBlock["data"],
  key: string,
  context: string,
): string {
  const value = data[key];
  if (value === undefined || value === null) return "";

  const merged = pick(data, key);
  const url = merged ? merged.ja : value;
  if (typeof url === "string" && isHttpUrl(url)) return url;

  warnOnce(
    `image:${context}:${key}`,
    `[cms:unexpected-content] ${context}: field "${key}" is not a usable image URL (got ${JSON.stringify(value)}) — rendering no image rather than a bundled file. A raw UUID here means the delivery API's best-effort media expansion did not run for this block, or the editor chose no/invalid media. This warning only prints once per field per process.`,
  );
  return "";
}

// ---------------------------------------------------------------------------
// Block-type mapping
//
// A block's type is READ, not inferred. `GET /pages/:slug` returns every block
// with its content type's hyphenated slug in a `type` field, and
// `client.ts#fetchPageBlocks` forwards it as `CmsBlock.type`.
//
// It is `type` and NOT `blockTypeId` that is matched here: `block_type_id`
// is the content type's UUID, which `scripts/atlas/seed-*.ts` fills from
// `getContentType(...).id`, so comparing it to a schema slug would never
// match. Reading the slug removes the guess, and with it the hand-copied
// field lists that used to shadow `scripts/atlas/schema.ts`.
// ---------------------------------------------------------------------------

/**
 * The block types one page is built from, as a list of content-type slugs.
 *
 * Typed `readonly CmsBlockTypeId[]` (`keyof AtlasContentTypes`, generated by
 * `npm run atlas:types`), which is the compile-time half of the contract: a
 * typo (`"nav_item"`) or a content type deleted from the workspace fails
 * `tsc` at the declaration, instead of silently never matching a block.
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
 * A repeated type may have ANY number of blocks. Blocks of a type this page
 * does not declare are IGNORED (with one warning per page per process).
 *
 * Returns `null` — after calling `reportFallback` — only when a declared type
 * has no matching block at all. That is the one case where the page genuinely
 * cannot be assembled and the caller must treat the page as unavailable (the
 * route 404s / errors rather than serving stale content).
 */
export function mapBlocksByType<S extends BlockTypeList>(
  slug: string,
  blocks: readonly CmsBlock[],
  types: S,
  reportFallback: (slug: string, detail: string) => void,
): BlockGroups<S> | null {
  const groups = groupBySlug(blocks);

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
      `[cms:unexpected-content] page "${slug}" returned ${ignoredCount} block(s) of ${ignored.length} type(s) that no loader maps — they are IGNORED: ${describeGroups(ignored)}. Either the block was added in the dashboard without a loader change, or the loader's block-type list is out of date. This warning only prints once per page per process.`,
    );
  }

  return assigned as BlockGroups<S>;
}
