import type { AtlasContentTypes } from "./atlas.types";

/**
 * Shared Atlas CMS types for marketing-web.
 *
 * These describe two shapes:
 * 1. The RAW response of `atlas.raw.get("/pages/<slug>")` — read WITHOUT a
 *    `?locale=` query param, per architecture-plan.json#read_strategy. This is
 *    the only call that returns JA (`data`) and EN (`block_translations`) in a
 *    single request; `atlas.pages.get()` merges to one locale and must not be
 *    used for pages.
 * 2. The PARSED shape `getPageBlocks()` (features/cms/client.ts) returns after
 *    `JSON.parse`-ing every stringified `data` field and merging JA/EN per
 *    field into `Bilingual`.
 *
 * `Bilingual` intentionally matches `constants/copy.ts#Bilingual` exactly so
 * loaders in features/cms/*.ts can drop a CMS-sourced value straight into a
 * shape that already satisfies the constants types.
 */

/** Matches constants/copy.ts#Bilingual. Keep these two in sync by hand — this
 * file must not import from constants/ (features/cms/*.ts loaders do that). */
export type Bilingual = {
  ja: string;
  en: string;
};

// ---------------------------------------------------------------------------
// Raw response shapes — straight off the wire, before any parsing.
// ---------------------------------------------------------------------------

/**
 * One block as it appears in `raw.get("/pages/<slug>")`. `data` is a JSON
 * string (the JA / base-locale values) — NOT an object. Always `JSON.parse`
 * before use.
 */
export interface RawBlock {
  id: string;
  /**
   * The content type's UUID — NOT its slug. `scripts/atlas/seed-*.ts` fills
   * this from `getContentType(...).id`, and that is what comes back here
   * (verified against the live workspace: `01a01d67-77d2-7bb7-a6d5-...`).
   * Do not compare it to a schema slug like `"nav-item"`; it will never match.
   */
  block_type_id: string;
  /**
   * The content type's hyphenated SLUG (`"nav-item"`, `"site-brand"`) — the
   * human-readable counterpart of `block_type_id`, and a value of
   * `CmsBlockTypeId`. Verified present on every block of every page in the
   * live `/pages/:slug` response, whose per-block keys are exactly
   * `id, page_id, block_type_id, position, data, type`.
   *
   * `client.ts#fetchPageBlocks` copies it onto `CmsBlock.type`, and
   * `fields.ts#mapBlocksByType` matches on it directly — a block's identity
   * is read, never inferred.
   */
  type?: string;
  parent_id: string | null;
  position: number;
  /** JSON-encoded object of the block type's fields, in the base locale (ja). */
  data: string;
}

/**
 * The EN overlay for one block. `data` is a JSON string containing only the
 * localizable fields that have an EN value.
 */
export interface RawBlockTranslation {
  id: string;
  block_id: string;
  locale: string;
  /** JSON-encoded object — only localizable fields, EN values. */
  data: string;
}

/** The EN overlay for a page's SEO metadata. `seo` is a JSON string. */
export interface RawSeoTranslation {
  locale: string;
  seo: string;
}

/** Full response body of `GET /pages/<slug>` (no `?locale=`). */
export interface RawPageResponse {
  id: string;
  slug: string;
  status: string;
  /** JSON-encoded AtlasPageSEO-shaped object, base locale (ja). */
  seo?: string;
  blocks: RawBlock[];
  seo_translations?: RawSeoTranslation[];
  block_translations?: RawBlockTranslation[];
}

// ---------------------------------------------------------------------------
// Parsed shapes — what getPageBlocks() returns.
// ---------------------------------------------------------------------------

/**
 * A single field's value after JA/EN merge. `undefined` when BOTH locales are
 * empty — never `{ ja: "", en: "" }`. An empty-but-present Bilingual object is
 * truthy and changes layout in components that render conditionally on a
 * field's presence (careCourse.fees[].note, rate_row.detail, hero.body).
 */
export type MergedField = Bilingual | undefined;

/**
 * A block's field map after JA/EN merge. Non-localizable fields keep their
 * raw JSON value (string | number | boolean | null); localizable fields
 * become `MergedField`. Loaders in features/cms/*.ts narrow this per block
 * type using the field lists in architecture-plan.json.
 */
export type ParsedBlockData = Record<string, unknown>;

/** A block after JSON.parse + JA/EN merge, sorted by `position`. */
export interface CmsBlock {
  id: string;
  /**
   * The content type's hyphenated slug, straight from `RawBlock.type` — the
   * block's identity, and what `fields.ts#mapBlocksByType` groups on.
   *
   * Typed `string`, not `CmsBlockTypeId`: this value is whatever the API
   * sent, so narrowing it here would be an unchecked assertion. The
   * compile-time guarantee lives where the slugs are DECLARED instead — a
   * loader's block-type list is `readonly CmsBlockTypeId[]`, so a typo fails
   * `tsc`. `""` when the field is absent, which matches no declared type.
   */
  type: string;
  /**
   * The content type's UUID (`RawBlock.block_type_id`). Kept alongside `type`
   * as the identifier that survives a slug rename on the workspace; nothing
   * matches on it any more.
   */
  blockTypeId: string;
  parentId: string | null;
  position: number;
  data: ParsedBlockData;
}

// ---------------------------------------------------------------------------
// Schema-derived types — built on top of `atlas.types.ts` (generated,
// `npm run atlas:types`).
//
// Regenerate `atlas.types.ts` whenever a content type or field is added,
// renamed, or removed on the workspace (i.e. whenever `scripts/atlas/schema.ts`
// changes) — run `npm run atlas:types` and commit the diff. Stale types don't
// fail at runtime (the SDK still sends whatever the API returns); they only
// fail at compile time here, or silently type a new field as missing.
//
// `atlas.types.ts` is NOT a replacement for `Bilingual`/`MergedField` above.
// Per cli-typegen.md's field-type mapping, a localizable field generates as
// its base-locale type with a `// localizable` comment only — there is no
// per-locale map in the generated output, and the comment is not readable at
// the type level. `client.ts#mergeBlockData` is the actual source of the
// bilingual shape: it wraps EVERY string field (localizable or not) as
// `Bilingual | undefined`, because it cannot tell the two apart from the wire
// either — for non-localizable strings ja === en, which is harmless. The
// mapped type below mirrors that real transform, not the schema comment.
// ---------------------------------------------------------------------------

/**
 * Every content-type slug the workspace defines, e.g. `"home-hero"`.
 *
 * This is the load-bearing use of `atlas.types.ts`: `fields.ts#BlockTypeList`
 * is `readonly CmsBlockTypeId[]`, so each loader's block-type list is checked
 * against the real workspace schema at compile time. Rename or delete a
 * content type, regenerate with `npm run atlas:types`, and every loader that
 * still names the old slug fails `tsc` — instead of quietly never matching a
 * block and reverting its page to `constants/*.ts` at runtime.
 */
export type CmsBlockTypeId = keyof AtlasContentTypes;

/**
 * Maps a generated Atlas content-type interface (e.g. `HomeHero`) to the
 * shape `getPageBlocks()` actually returns at runtime: every string field
 * becomes `Bilingual | undefined`, every non-string field (number, boolean,
 * ...) passes through unchanged. Mirrors `client.ts#mergeBlockData` exactly.
 */
export type MergedBlockData<T> = {
  [K in keyof T]: T[K] extends string | undefined ? Bilingual | undefined : T[K];
};

/** `MergedBlockData` for a given content-type slug — convenience alias. */
export type MergedBlockDataFor<K extends CmsBlockTypeId> = MergedBlockData<AtlasContentTypes[K]>;
