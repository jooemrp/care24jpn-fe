import type { AtlasContentTypes } from "./atlas.types";

/**
 * Shared Atlas CMS types for marketing-web.
 *
 * These describe two shapes:
 * 1. The RAW response of `atlas.raw.get("/pages/<slug>")` — read WITHOUT a
 *    `?locale=` query param, because that is the only call that returns JA
 *    (`data`) and EN (`block_translations`) in a single request;
 *    `atlas.pages.get()` merges to one locale and must not be used for
 *    pages.
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

/**
 * The EN overlay for a page's SEO metadata.
 *
 * CORRECTED after live verification for ST-03 (2026-08-20): the plan and an
 * earlier version of this comment claimed `seo` is a JSON-encoded STRING,
 * by analogy with block `data`. It is not. `GET /pages/<slug>` returned
 * `seo_translations[0].seo` as a real OBJECT on all three live pages checked
 * (`home`, `company`, `use-case`; `pricing` has no EN seo_translations row to
 * check). `atlas.raw.get` performs zero transformation on the response body
 * (see `@latellu/atlas-sdk`'s `src/http.ts` — `return { data: body.data, ... }`
 * verbatim), so this is the wire shape, not an SDK artifact.
 *
 * Typed as `string | Record<string, unknown>` and handled defensively in
 * `merge.ts#findEnSeoTranslation` (object used directly, string JSON.parse'd
 * inside try/catch) so neither shape silently degrades to "no EN overlay" —
 * which is exactly the failure the string-only assumption produced: parsing
 * an already-parsed object emits `"[object Object]"`, `JSON.parse` throws,
 * and the EN title mirrors `ja` instead of surfacing "Use cases" for
 * `getPageMeta("use-case")`.
 */
export interface RawSeoTranslation {
  locale: string;
  seo: string | Record<string, unknown>;
}

/**
 * The page RECORD, as it appears under `data.page` — verified against the
 * live response, whose `data.page` keys are exactly `id, workspace_id, slug,
 * status, position, seo, published_at, created_by, updated_by, created_at,
 * updated_at`.
 *
 * `seo` is a real OBJECT here, not a JSON string — unlike block `data`, which
 * the same response does send stringified. Do not `JSON.parse` it.
 */
export interface RawPageRecord {
  id: string;
  slug: string;
  status: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string | null;
    og_image?: string;
    canonical?: string;
  };
  /**
   * ISO timestamp of the page's last publish/edit. Present on the live
   * response (`data.page.updated_at`) but not previously declared here — see
   * the file header on `RawPageResponse` for the same kind of gap.
   */
  updated_at?: string;
}

/**
 * The `data` payload of `GET /pages/<slug>` (no `?locale=`), i.e. what
 * `atlas.raw.get()` returns as its `data` after unwrapping the
 * `{ success, message, data }` envelope.
 *
 * NOTE THE NESTING, which an earlier version of this type got wrong: the
 * page's own scalar fields live under `page`, while `blocks`,
 * `seo_translations` and `block_translations` are SIBLINGS of it at the top
 * level — not children. The old shape declared `id`/`slug`/`status`/`seo` at
 * the top level, so `response.seo` type-checked and was always `undefined` at
 * runtime. Only `blocks`/`block_translations` were ever read, so nothing
 * broke; the corrected shape is here so the first reader of the SEO object
 * fails at `tsc` instead of silently rendering nothing.
 */
export interface RawPageResponse {
  page?: RawPageRecord;
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
 * type using the field lists declared in scripts/atlas/schema.ts — that
 * file is the authoritative field list per block type, this type is
 * intentionally untyped beyond `Record<string, unknown>`.
 */
export type ParsedBlockData = Record<string, unknown>;

/**
 * A page's SEO metadata after JA/EN merge — what `getPageMeta()`
 * (features/cms/client.ts) returns, parallel to `CmsBlock[]` /
 * `getPageBlocks()`. Every field follows the same collapse rule as
 * `MergedField`: empty in BOTH locales becomes `undefined`, never
 * `{ ja: "", en: "" }`.
 *
 * `og_image` is exposed as `ogImage`, mirroring the camelCase the rest of
 * this file uses for parsed output (`RawPageRecord.seo.og_image` stays
 * snake_case because it is the raw wire shape).
 */
export interface PageMeta {
  title?: MergedField;
  description?: MergedField;
  ogImage?: MergedField;
  /** `RawPageRecord.updated_at`, forwarded unmerged — it is not per-locale. */
  updatedAt?: string;
}

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
// the type level. `merge.ts#mergeBlockData` is the actual source of the
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
 * ...) passes through unchanged. Mirrors `merge.ts#mergeBlockData` exactly.
 */
export type MergedBlockData<T> = {
  [K in keyof T]: T[K] extends string | undefined ? Bilingual | undefined : T[K];
};

/** `MergedBlockData` for a given content-type slug — convenience alias. */
export type MergedBlockDataFor<K extends CmsBlockTypeId> = MergedBlockData<AtlasContentTypes[K]>;
