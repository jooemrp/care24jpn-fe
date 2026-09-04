/**
 * Shared field pickers and block-type mapping for every `features/cms/*.ts`
 * loader.
 *
 * Two responsibilities, both previously copy-pasted per loader:
 *
 * 1. **Field pickers** (`pick`/`requiredBi`/`requiredJa`/`optionalLines`/...) —
 *    `merge.ts#mergeBlockData` cannot see the workspace schema, so every
 *    string field comes back as `Bilingual | undefined` regardless of whether
 *    it is localizable. These narrow that back to the shape the loader
 *    declares and throw a typed `CmsContentError` when required CMS content is
 *    missing or malformed.
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
import { CmsContentError } from "./errors.ts";
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
 * `console.warn`, at most once per `key` per process. Warnings are reserved
 * for extra CMS blocks that are ignored; malformed or missing required
 * content throws instead of being replaced.
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

function fieldPath(context: string, key: string): string {
  return `${context}.${key}`;
}

function missingField(context: string, key: string): never {
  const path = fieldPath(context, key);
  throw new CmsContentError(
    "CMS_MISSING_REQUIRED_FIELD",
    `Required CMS field "${path}" is missing or empty.`,
    [path],
    context,
  );
}

function invalidField(context: string, key: string): never {
  const path = fieldPath(context, key);
  throw new CmsContentError(
    "CMS_INVALID_REQUIRED_FIELD",
    `Required CMS field "${path}" is malformed.`,
    [path],
    context,
  );
}

/**
 * Reads a required bilingual CMS field without borrowing a value from the
 * application bundle. Both locales must contain non-whitespace text.
 */
export function requiredBi(
  data: CmsBlock["data"],
  key: string,
  context: string,
): Bilingual {
  const value = pick(data, key);
  if (!value || value.ja.trim() === "" || value.en.trim() === "") {
    return missingField(context, key);
  }
  return value;
}

/** Reads a required non-localized CMS string. */
export function requiredJa(
  data: CmsBlock["data"],
  key: string,
  context: string,
): string {
  const raw = data[key];
  if (typeof raw === "string") {
    if (raw.trim() === "") return missingField(context, key);
    return raw;
  }

  const value = pick(data, key);
  if (!value || value.ja.trim() === "") return missingField(context, key);
  return value.ja;
}

/** Reads an optional non-localized CMS string while rejecting malformed data. */
export function optionalJa(
  data: CmsBlock["data"],
  key: string,
  context: string,
): string | undefined {
  const raw = data[key];
  if (raw === undefined || raw === null) return undefined;

  if (typeof raw === "string") {
    return raw.trim() === "" ? undefined : raw;
  }

  const value = pick(data, key);
  if (!value) return invalidField(context, key);
  if (value.ja.trim() === "" && value.en.trim() === "") return undefined;
  if (value.ja.trim() === "") return invalidField(context, key);
  return value.ja;
}

/** Reads an optional bilingual field while rejecting malformed values. */
export function optionalBi(
  data: CmsBlock["data"],
  key: string,
  context: string,
): Bilingual | undefined {
  const raw = data[key];
  if (raw === undefined || raw === null) return undefined;

  const value = pick(data, key);
  if (!value) return invalidField(context, key);
  if (value.ja.trim() === "" && value.en.trim() === "") return undefined;
  if (value.ja.trim() === "" || value.en.trim() === "") {
    return invalidField(context, key);
  }
  return value;
}

function isAbsoluteHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

function isInternalUrl(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\u0000-\u001f\u007f]/.test(value)
  ) || value.startsWith("#") || value.startsWith("?");
}

/** Reads a required navigation/CTA URL authored by Atlas. */
export function requiredUrl(
  data: CmsBlock["data"],
  key: string,
  context: string,
): string {
  const raw = data[key];
  const value = (() => {
    if (typeof raw === "string") return raw;
    return pick(data, key)?.ja;
  })();

    if (!value || (!isAbsoluteHttpUrl(value) && !isInternalUrl(value))) {
    return invalidField(context, key);
  }
  return value;
}

/** Reads a required Atlas image field as an expanded absolute media URL. */
export function requiredImageUrl(
  data: CmsBlock["data"],
  key: string,
  context: string,
): string {
  const raw = data[key];
  const value = (() => {
    if (typeof raw === "string") return raw;
    return pick(data, key)?.ja;
  })();

  if (!value || !isAbsoluteHttpUrl(value)) return invalidField(context, key);
  return value;
}

/** Reads a required finite number using the Atlas field's declared number type. */
export function requiredNumber(
  data: CmsBlock["data"],
  key: string,
  context: string,
): number {
  const value = data[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return invalidField(context, key);
}

/** Reads a required value from a closed CMS select field. */
export function requiredEnum(
  data: CmsBlock["data"],
  key: string,
  allowed: readonly string[],
  context: string,
): string {
  const value = requiredJa(data, key, context);
  if (!allowed.includes(value)) return invalidField(context, key);
  return value;
}

/**
 * Splits a CMS textarea into bilingual lines. An unset/empty list is
 * represented as an empty array so existing empty states remain visible;
 * no line is copied from a constant or from the other locale.
 */
export function optionalLines(
  data: CmsBlock["data"],
  key: string,
  context: string,
): Bilingual[] {
  const raw = data[key];
  if (raw === undefined || raw === null) return [];

  const value = pick(data, key);
  if (!value) return invalidField(context, key);

  const jaLines = value.ja === "" ? [] : value.ja.split("\n");
  const enLines = value.en === "" ? [] : value.en.split("\n");
  if (jaLines.length !== enLines.length) return invalidField(context, key);
  if (jaLines.some((line) => line.trim() === "") || enLines.some((line) => line.trim() === "")) {
    return invalidField(context, key);
  }
  return jaLines.map((ja, index) => ({ ja, en: enLines[index]! }));
}

/* Required numeric fields are validated by `requiredNumber` above. */

/** Image fields are validated by `requiredImageUrl` above. */

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
 * `tsc` at the declaration, instead of silently never matching a block.
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
 *   the dashboard renders 5 nav items without changing the rest of the page.
 * - Blocks of a type this page does not declare are IGNORED (with one warning
 *   per page per process), not treated as corruption.
 * - Two types that carry identical fields stay distinct, because nothing here
 *   looks at fields. A `footer-legal-link` dragged above a `nav-item` is
 *   still a legal link.
 *
 * A page with a missing declared type cannot be assembled and throws a typed
 * `CmsContentError`; callers must surface that failure instead of replacing
 * the page with bundled content.
 */
export function mapBlocksByType<S extends BlockTypeList>(
  slug: string,
  blocks: readonly CmsBlock[],
  types: S,
): BlockGroups<S>;
export function mapBlocksByType<S extends BlockTypeList>(
  slug: string,
  blocks: readonly CmsBlock[],
  types: S,
): BlockGroups<S> {
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
    throw new CmsContentError(
      "CMS_MISSING_REQUIRED_BLOCK",
      `Page "${slug}" is missing required CMS block type(s): ${missing.join(", ")}.`,
      missing.map((type) => `${slug}.${type}`),
      slug,
    );
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
