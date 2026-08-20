/**
 * scripts/atlas/drift-check.ts — ST-02, D-2 option A.
 *
 * WHY THIS SCRIPT EXISTS.
 * `ensurePublishedPage` (`scripts/atlas/lib.ts:739-757`) sends the COMPLETE
 * desired page to `PUT /pages/:slug` on every seed run — a FULL REPLACE, not
 * a merge. Its own doc comment says so: "the backend replaces the whole
 * block list rather than merging into it." There is no rollback, no backup
 * and no content-versioning anywhere in this pipeline (verified by
 * `output/scout-atlas-pipeline.md` §9 — grepped `lib.ts`, `seed-all.ts`,
 * `README.md` for "rollback"/"backup"/"version" with no relevant hits). So
 * if a content editor has ever changed a seeded page through the Atlas
 * dashboard, the next `npm run atlas:seed` silently deletes that edit — no
 * error, no diff, no warning. Today that risk is theoretical only because
 * live drift happens to be zero; this script turns "happens to be zero"
 * into a machine-checked invariant that a CI/human gate can rely on BEFORE
 * any seed script runs.
 *
 * WHY SNAPSHOT-DIFF, NOT A PAYLOAD SIMULATOR.
 * The honest way to detect "would a reseed change anything" is to build the
 * exact payload each `seed-*.ts` would PUT and diff it against live. That is
 * not buildable cheaply: every `scripts/atlas/seed-*.ts` calls its own
 * `main()` at module load (`seed-all.ts:4-14` spawns them as child
 * processes, never imports them), so a seed script's payload cannot be
 * constructed by importing it — only by running it, which is itself a write.
 * Instead, this script re-fetches every live page over the SAME read-only
 * delivery path `features/cms/client.ts#fetchRawPage` uses
 * (`GET /api/v1/public/pages/:slug`, `X-API-Key` = `ATLAS_API_KEY`, the
 * `atlas_live_*` key — never `ATLAS_MGMT_KEY`), normalizes it, and diffs
 * that normalized form against a COMMITTED snapshot of the same shape.
 *
 * THE EQUIVALENCE THAT MAKES THIS VALID, AND ITS EXPIRY.
 * A snapshot taken immediately after a known-good seed run is, by
 * construction, exactly what that seed run's payload produced (module-level
 * `[AUDIT:274]` already confirmed this for the 14 legal bodies: zero drift,
 * and the legal-html serializer's HTML output was proven byte-identical to
 * the 7 live legal bodies). So "live now == committed snapshot" is
 * equivalent to "live now == what the last seed run wrote", which is
 * exactly the question a pre-seed gate needs answered. That equivalence
 * has an EXPIRY: it only holds up to the next successful seed run or the
 * next dashboard edit. Every `npm run atlas:seed` / `npx tsx
 * scripts/atlas/seed-*.ts` run MUST be immediately followed by
 * `npx tsx scripts/atlas/drift-check.ts --write --only=<slugs it touched>`
 * (or a full `--write` after `atlas:seed`) to refresh the snapshot — an
 * un-refreshed snapshot after a legitimate seed will falsely report drift
 * on the very fields that seed just (correctly) changed.
 *
 * SCOPE.
 * Normalizes `{ slug, seo, seo_translations, blocks: [{ type, data }] }` —
 * i.e. everything `ensurePublishedPage` full-replaces on a page: the block
 * list AND `page.seo` / `page.seo_translations`. The SEO half exists
 * because ST-09 is about to start writing `seo.title` and
 * `seo.description` to this same production workspace via the same
 * full-replace path, so a dashboard SEO edit made today has to be caught
 * BEFORE that write, not after. The equivalence and expiry note above
 * covers both halves identically: any seed run (ST-09 included) must be
 * followed by `--write` or the next check falsely reports that seed's own
 * (correct) SEO change as drift.
 *
 * SEO WIRE-FORMAT TRAP (already cost one lane elsewhere in this run — see
 * `features/cms/types.ts`'s `RawSeoTranslation` doc comment). `page.seo` is
 * a real OBJECT. `seo_translations[].seo` is DOCUMENTED as a JSON-encoded
 * STRING but the live `care-24` workspace actually returns it as an
 * ALREADY-PARSED OBJECT. `parseSeoValue` below handles both shapes
 * defensively (object used as-is, string `JSON.parse`d inside try/catch) —
 * mirrors the same defensive read `features/cms/merge.ts#findEnSeoTranslation`
 * already does for the app's own render path; reimplemented locally here
 * (not imported) because that function is private to `merge.ts` and this
 * sub-task's claimed files don't include `merge.ts`.
 *
 * WHAT THIS SCRIPT NEVER DOES.
 * Zero write requests to Atlas. Only `fetch(..., { method: "GET" })` (the
 * implicit default) against `/api/v1/public/pages/:slug`. Never imports
 * `ATLAS_MGMT_KEY`, `createScriptManagementClient`, or any `client.pages.*`
 * write method. `--write` only writes the LOCAL snapshot file on disk.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/drift-check.ts                    # compare, exit 1 on drift
 *   npx tsx scripts/atlas/drift-check.ts --write             # (re)write the snapshot, exit 0
 *   npx tsx scripts/atlas/drift-check.ts --only=home,site    # scope to specific slugs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "./lib";
import { parseData, findEnTranslationData, mergeBlockData } from "../../features/cms/merge";
import type { RawPageResponse, RawSeoTranslation } from "../../features/cms/types";

const SNAPSHOT_PATH = resolve(process.cwd(), "scripts/atlas/live-snapshot.json");

/**
 * All 15 live pages this run seeds, enumerated FROM THE SEED SCRIPTS — never
 * invented. Legal 7 from `features/cms/legal.ts:11-19` (`LEGAL_SLUG_TO_KEY`,
 * matched against `scripts/atlas/seed-legal.ts:44-50`'s `LEGAL_PAGES`).
 * `site`/`home` from `seed-site.ts:212` / `seed-home.ts:350`.
 * `rates`/`pricing`/`fees` from `seed-rates.ts:214,222,233`.
 * `use-case`/`service-flow`/`company` from `seed-pages.ts:214,246,278`.
 */
const ALL_SLUGS = [
  "site",
  "home",
  "rates",
  "pricing",
  "fees",
  "use-case",
  "service-flow",
  "company",
  "legal-privacy",
  "legal-tokushoho",
  "legal-terms-for-care-supporters",
  "legal-terms-for-users",
  "legal-cancellation-policy",
  "legal-compensation",
  "legal-quasi-mandate",
] as const;

type Slug = (typeof ALL_SLUGS)[number];

/** One block, normalized: identity (`type`) plus content (`data`), with
 * every volatile field dropped (block id, page id, position, parent_id,
 * created_at, updated_at, published_at) — a reseed changes ids and
 * timestamps by design (`seed-all.ts:51-55`), so keeping them would make
 * every rerun look like drift even with byte-identical content. `data` is
 * the JA/EN-merged form (`features/cms/merge.ts#mergeBlockData`), so an
 * EN-only edit in the dashboard is caught too, not just JA. */
interface NormalizedBlock {
  type: string;
  data: Record<string, unknown>;
}

/** The 5 SEO fields that live on both `page.seo` (base/ja) and each entry of
 * `page.seo_translations[].seo` (per-locale overlay) — the exact set
 * `RawPageRecord.seo` declares. A field simply absent from the live payload
 * is omitted here too (not coerced to `""`/`null`), so "field never existed"
 * and "field was cleared" stay distinguishable in a diff. */
interface NormalizedSeoFields {
  title?: string;
  description?: string;
  keywords?: string | null;
  og_image?: string;
  canonical?: string;
}

/** One page, normalized and ready to compare or snapshot. `blocks` is
 * SORTED BY CONTENT-TYPE SLUG (never by array position — `mapBlocksByType`
 * is the contract, per project rule), with a stable secondary order that
 * falls out of `Array.prototype.sort`'s stability: blocks of the same type
 * keep the live response's position order. `seoTranslations` is keyed BY
 * LOCALE (never by array position — `seo_translations` is a small array
 * today but nothing guarantees index-0-is-en going forward). */
interface NormalizedPage {
  slug: Slug;
  seo: NormalizedSeoFields;
  seoTranslations: Record<string, NormalizedSeoFields>;
  blocks: NormalizedBlock[];
}

interface Snapshot {
  /** Not compared — informational only, so `--write` always changes the
   * file even when content is byte-identical (proves the write happened). */
  generatedAt: string;
  pages: NormalizedPage[];
}

// ---------------------------------------------------------------------------
// Read path — mirrors features/cms/client.ts#fetchRawPage exactly, minus the
// SDK (this script has no `server-only`/`react` boundary to respect, so a
// plain `fetch` keeps it dependency-free and trivially greppable for the
// "no write" acceptance criterion).
// ---------------------------------------------------------------------------

interface DeliveryEnv {
  baseUrl: string;
  apiKey: string;
}

function requireDeliveryEnv(): DeliveryEnv {
  loadEnv();

  const baseUrl = process.env.ATLAS_BASE_URL;
  const apiKey = process.env.ATLAS_API_KEY;

  if (!baseUrl) {
    throw new Error(
      "ATLAS_BASE_URL is not set. Add it to marketing-web/.env before running drift-check.ts.",
    );
  }
  if (!apiKey) {
    throw new Error(
      "ATLAS_API_KEY is not set. Add it to marketing-web/.env before running drift-check.ts. " +
        "This must be the atlas_live_ delivery key — never ATLAS_MGMT_KEY, which this script " +
        "must never read.",
    );
  }

  return { baseUrl, apiKey };
}

/** GET-only. No PUT/POST/PATCH/DELETE anywhere in this file. */
async function fetchRawPage(env: DeliveryEnv, slug: Slug): Promise<RawPageResponse | null> {
  const res = await fetch(`${env.baseUrl}/api/v1/public/pages/${slug}`, {
    headers: { "X-API-Key": env.apiKey },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`GET /pages/${slug} -> HTTP ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as { success: boolean; data?: RawPageResponse };
  if (!body.success || !body.data) return null;
  return body.data;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** Handles the documented-string-vs-actual-object trap (see file header):
 * `page.seo` always arrives as an object already, `seo_translations[].seo`
 * is declared `string | Record<string, unknown>` and the live workspace has
 * been observed sending the object form despite the docs. Never assume
 * either shape — check, then parse only if actually a string. */
function parseSeoValue(seo: string | Record<string, unknown> | undefined | null): Record<string, unknown> {
  if (!seo) return {};
  if (typeof seo === "object") {
    return Array.isArray(seo) ? {} : seo;
  }
  try {
    const parsed: unknown = JSON.parse(seo);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Narrows an already-parsed SEO object down to exactly the 5 known fields,
 * dropping anything else (there is nothing volatile in `seo` today, but this
 * keeps the snapshot from silently growing if the schema ever adds a field
 * this script doesn't know to normalize). */
function pickSeoFields(raw: Record<string, unknown> | undefined): NormalizedSeoFields {
  if (!raw) return {};
  const out: NormalizedSeoFields = {};
  if (typeof raw.title === "string") out.title = raw.title;
  if (typeof raw.description === "string") out.description = raw.description;
  if (raw.keywords === null || typeof raw.keywords === "string") out.keywords = raw.keywords as string | null;
  if (typeof raw.og_image === "string") out.og_image = raw.og_image;
  if (typeof raw.canonical === "string") out.canonical = raw.canonical;
  return out;
}

/** Keys `seo_translations` BY LOCALE, sorted, so `en` (or any future locale)
 * is addressed by name in a diff path — never by its position in the array. */
function normalizeSeoTranslations(
  translations: RawSeoTranslation[] | undefined,
): Record<string, NormalizedSeoFields> {
  const byLocale = new Map<string, NormalizedSeoFields>();
  for (const t of translations ?? []) {
    if (!t.locale) continue;
    byLocale.set(t.locale, pickSeoFields(parseSeoValue(t.seo)));
  }

  const out: Record<string, NormalizedSeoFields> = {};
  for (const locale of [...byLocale.keys()].sort()) {
    out[locale] = byLocale.get(locale)!;
  }
  return out;
}

function normalizePage(slug: Slug, raw: RawPageResponse | null): NormalizedPage {
  const seo = pickSeoFields(raw?.page?.seo);
  const seoTranslations = normalizeSeoTranslations(raw?.seo_translations);

  const blocks: NormalizedBlock[] = (raw?.blocks ?? []).map((block) => {
    const baseData = parseData(block.data);
    const enData = findEnTranslationData(block.id, raw?.block_translations);
    return {
      type: block.type ?? "",
      data: mergeBlockData(baseData, enData) as Record<string, unknown>,
    };
  });

  // Sort key = content-type slug, NEVER array position (mapBlocksByType is
  // the contract). `Array.prototype.sort` is stable (Node >= 11 / ES2019),
  // so blocks sharing a `type` keep the order the live response already
  // sorted them into (by `position`) — that relative order is meaningful
  // content (e.g. `company_row` display order), unlike the raw `position`
  // number itself, which is dropped.
  blocks.sort((a, b) => a.type.localeCompare(b.type));

  return { slug, seo, seoTranslations, blocks };
}

async function fetchAllNormalized(env: DeliveryEnv, slugs: readonly Slug[]): Promise<NormalizedPage[]> {
  const pages: NormalizedPage[] = [];
  for (const slug of slugs) {
    const raw = await fetchRawPage(env, slug);
    pages.push(normalizePage(slug, raw));
  }
  return pages;
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

/** Recursively diffs two JSON-comparable values, collecting every differing
 * leaf path into `out` as `<page>.<content-type>[<index>].<field...>`. Plain
 * objects are compared key-by-key (union of both sides, so a field ADDED or
 * REMOVED live shows up too, not just changed); arrays are compared
 * index-by-index with a length check; everything else falls back to
 * `Object.is`/deep-equal-by-JSON for primitives. */
function diffValues(path: string, a: unknown, b: unknown, out: string[]): void {
  if (a === b) return;

  const aIsObj = a !== null && typeof a === "object" && !Array.isArray(a);
  const bIsObj = b !== null && typeof b === "object" && !Array.isArray(b);
  if (aIsObj && bIsObj) {
    const keys = new Set([
      ...Object.keys(a as Record<string, unknown>),
      ...Object.keys(b as Record<string, unknown>),
    ]);
    for (const key of keys) {
      diffValues(
        `${path}.${key}`,
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        out,
      );
    }
    return;
  }

  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);
  if (aIsArr && bIsArr) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      diffValues(`${path}[${i}]`, a[i], b[i], out);
    }
    return;
  }

  // Type mismatch (object vs array vs primitive) or differing primitives.
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    out.push(path);
  }
}

function diffPages(snapshot: NormalizedPage, live: NormalizedPage): string[] {
  const out: string[] = [];

  // `page.seo` (base/ja) — path e.g. `pricing.seo.description`.
  diffValues(`${snapshot.slug}.seo`, snapshot.seo, live.seo, out);

  // `seo_translations`, keyed by locale — path e.g.
  // `pricing.seo_translations.en.title`, never `seo_translations[0].title`.
  const locales = new Set([
    ...Object.keys(snapshot.seoTranslations),
    ...Object.keys(live.seoTranslations),
  ]);
  for (const locale of locales) {
    diffValues(
      `${snapshot.slug}.seo_translations.${locale}`,
      snapshot.seoTranslations[locale],
      live.seoTranslations[locale],
      out,
    );
  }

  const typesSeen = new Set([...snapshot.blocks.map((b) => b.type), ...live.blocks.map((b) => b.type)]);
  for (const type of typesSeen) {
    const snapBlocks = snapshot.blocks.filter((b) => b.type === type);
    const liveBlocks = live.blocks.filter((b) => b.type === type);
    const len = Math.max(snapBlocks.length, liveBlocks.length);
    for (let i = 0; i < len; i++) {
      const path = `${snapshot.slug}.${type}[${i}]`;
      if (!snapBlocks[i]) {
        out.push(`${path} (block present live, missing from snapshot)`);
        continue;
      }
      if (!liveBlocks[i]) {
        out.push(`${path} (block present in snapshot, missing live)`);
        continue;
      }
      diffValues(path, snapBlocks[i].data, liveBlocks[i].data, out);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { write: boolean; only: Slug[] | null } {
  let write = false;
  let only: Slug[] | null = null;

  for (const arg of argv) {
    if (arg === "--write") {
      write = true;
    } else if (arg.startsWith("--only=")) {
      const requested = arg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const slug of requested) {
        if (!(ALL_SLUGS as readonly string[]).includes(slug)) {
          throw new Error(
            `--only names unknown slug "${slug}". Known slugs: ${ALL_SLUGS.join(", ")}`,
          );
        }
      }
      only = requested as Slug[];
    } else {
      throw new Error(`Unrecognized argument "${arg}". Supported: --write, --only=<slug>[,<slug>]`);
    }
  }

  return { write, only };
}

function readSnapshot(): Snapshot | null {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  const parsed: unknown = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Snapshot).pages)) {
    throw new Error(`${SNAPSHOT_PATH} does not look like a drift-check snapshot (missing "pages" array).`);
  }
  return parsed as Snapshot;
}

function writeSnapshot(pages: NormalizedPage[]): void {
  const snapshot: Snapshot = { generatedAt: new Date().toISOString(), pages };
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const { write, only } = parseArgs(process.argv.slice(2));
  const env = requireDeliveryEnv();
  const slugs = only ?? ALL_SLUGS;

  console.log(
    `[atlas:drift] fetching ${slugs.length} page(s) via GET /api/v1/public/pages/:slug (read-only, delivery key)...`,
  );
  const live = await fetchAllNormalized(env, slugs);

  if (write) {
    // Scoped writes (`--only=`) merge into whatever snapshot already exists,
    // so gating a single seed script's slugs doesn't blow away the other
    // pages' committed state.
    const existing = readSnapshot();
    const merged = new Map<Slug, NormalizedPage>();
    for (const page of existing?.pages ?? []) {
      merged.set(page.slug as Slug, page);
    }
    for (const page of live) {
      merged.set(page.slug, page);
    }
    const orderedSlugs = ALL_SLUGS.filter((s) => merged.has(s));
    writeSnapshot(orderedSlugs.map((s) => merged.get(s)!));
    console.log(`[atlas:drift] wrote ${SNAPSHOT_PATH} (${orderedSlugs.length} page(s)).`);
    process.exitCode = 0;
    return;
  }

  const snapshot = readSnapshot();
  if (!snapshot) {
    throw new Error(
      `No committed snapshot at ${SNAPSHOT_PATH}. Run "npx tsx scripts/atlas/drift-check.ts --write" first.`,
    );
  }

  const bySlug = new Map(snapshot.pages.map((p) => [p.slug, p] as const));
  const allDiffs: string[] = [];

  for (const page of live) {
    const snapPage = bySlug.get(page.slug);
    if (!snapPage) {
      allDiffs.push(`${page.slug} (page present live, missing from snapshot entirely)`);
      continue;
    }
    allDiffs.push(...diffPages(snapPage, page));
  }

  if (allDiffs.length === 0) {
    console.log(`[atlas:drift] no drift across ${slugs.length} page(s). Live matches ${SNAPSHOT_PATH}.`);
    process.exitCode = 0;
    return;
  }

  console.error(
    `[atlas:drift] DRIFT DETECTED — live content differs from the committed snapshot in ${allDiffs.length} field(s).`,
  );
  console.error(
    "[atlas:drift] This means a dashboard edit exists that `npm run atlas:seed` would SILENTLY OVERWRITE " +
      "(ensurePublishedPage is a full replace, not a merge — scripts/atlas/lib.ts:733-737). " +
      "Do NOT reseed the affected page(s) until this is investigated and, if the drift is intentional, " +
      "the snapshot is refreshed with --write.",
  );
  for (const path of allDiffs) {
    console.error(`  - ${path}`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("[atlas:drift] failed:", error);
  process.exitCode = 1;
});
