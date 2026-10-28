/**
 * Brand spelling: every CMS string that still says "Care 24 Japan" (with
 * spaces) becomes "Care24Japan". The site reads brand name, footer legal line,
 * logo alt, page SEO and body copy from Atlas, so this is the only place the
 * rename can take effect for them — constants in code only cover the seeds.
 *
 * Walks every published page and rewrites, in JA base and EN translations:
 *   - block data (strings, recursively, incl. JSON-encoded string fields)
 *   - page `seo` and `seo_translations`
 * Nothing else is touched: all live blocks are re-submitted as they are
 * (optimistic locking via updatedAt), and a page with no hit is skipped.
 *
 * Usage:
 *   npx tsx scripts/atlas/patch-brand-name.ts           # dry run, lists hits
 *   npx tsx scripts/atlas/patch-brand-name.ts --apply   # writes + keeps published
 */
import {
  createScriptManagementClient,
  loadEnv,
  requireAtlasEnv,
} from "./lib";

const BRAND_RE = /Care[  　]*24[  　]*Japan/g;
const BRAND = "Care24Japan";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type RawBlock = {
  id: string;
  block_type_id: string;
  position: number;
  data: string | Record<string, unknown>;
  type: string;
};

type RawBlockTranslation = {
  block_id: string;
  locale: string;
  data: string | Record<string, unknown>;
};

type RawSeoTranslation = { locale: string; seo: unknown };

type RawPageResponse = {
  page?: { updated_at?: string; status?: string; seo?: unknown };
  blocks?: RawBlock[];
  block_translations?: RawBlockTranslation[];
  seo_translations?: RawSeoTranslation[];
};

function parseObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return { ...(value as Record<string, unknown>) };
  if (typeof value === "string") {
    if (value.trim() === "") return {};
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ...(parsed as Record<string, unknown>) };
    }
  }
  throw new Error("Atlas returned a non-object payload.");
}

/** Rewrites brand spelling in every string reachable from `value`. Returns the
 * new value and the number of replaced occurrences. */
function rewrite(value: unknown): { value: unknown; hits: number } {
  if (typeof value === "string") {
    let hits = 0;
    const next = value.replace(BRAND_RE, (m) => {
      if (m === BRAND) return m;
      hits += 1;
      return BRAND;
    });
    return { value: next, hits };
  }
  if (Array.isArray(value)) {
    let hits = 0;
    const out = (value as Json[]).map((item) => {
      const r = rewrite(item);
      hits += r.hits;
      return r.value;
    });
    return { value: out, hits };
  }
  if (value && typeof value === "object") {
    let hits = 0;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = rewrite(v);
      hits += r.hits;
      out[k] = r.value;
    }
    return { value: out, hits };
  }
  return { value, hits: 0 };
}

async function get(path: string): Promise<unknown> {
  const { baseUrl } = requireAtlasEnv();
  const key = process.env.ATLAS_API_KEY;
  if (!key) throw new Error("ATLAS_API_KEY is required for the read-before-write step.");
  const res = await fetch(`${baseUrl}/api/v1/public${path}`, {
    headers: { "X-API-Key": key },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  const body = (await res.json()) as { success?: boolean; data?: unknown };
  if (!body.success) throw new Error(`GET ${path} -> success=false`);
  return body.data;
}

async function main(): Promise<void> {
  loadEnv();
  const apply = process.argv.includes("--apply");

  const list = (await get("/pages?limit=100")) as
    | { slug: string }[]
    | { pages?: { slug: string }[]; items?: { slug: string }[] };
  const slugs = (Array.isArray(list) ? list : (list.pages ?? list.items ?? [])).map(
    (p) => p.slug,
  );

  const client = apply ? await createScriptManagementClient(120_000) : null;
  let total = 0;

  for (const slug of slugs) {
    const page = (await get(`/pages/${slug}`)) as RawPageResponse;
    const updatedAt = page.page?.updated_at;
    if (!updatedAt || !page.blocks) {
      throw new Error(`Incomplete published page (${slug}).`);
    }

    let hits = 0;

    const enByBlock = new Map<string, unknown>();
    for (const row of page.block_translations ?? []) {
      if (row.locale !== "en") continue;
      const r = rewrite(parseObject(row.data));
      hits += r.hits;
      enByBlock.set(row.block_id, r.value);
    }

    const blocks = page.blocks.map((block) => {
      const r = rewrite(parseObject(block.data));
      hits += r.hits;
      const enData = enByBlock.get(block.id);
      return {
        block_type_id: block.block_type_id,
        parent_id: null,
        position: block.position,
        data: r.value as Record<string, unknown>,
        ...(enData ? { translations: { en: { data: enData } } } : {}),
      };
    });

    const seoBase = rewrite(parseObject(page.page?.seo));
    hits += seoBase.hits;
    const seoTranslations: Record<string, unknown> = {};
    let seoTranslationHits = 0;
    for (const row of page.seo_translations ?? []) {
      const r = rewrite(parseObject(row.seo));
      seoTranslationHits += r.hits;
      seoTranslations[row.locale] = r.value;
    }
    hits += seoTranslationHits;

    if (hits === 0) continue;
    total += hits;
    console.log(`${slug}: ${hits} replacement(s)`);

    if (!client) continue;

    const body: Record<string, unknown> = { updatedAt, blocks };
    if (seoBase.hits > 0) body.seo = seoBase.value;
    if (seoTranslationHits > 0) body.seo_translations = seoTranslations;

    const updated = (await client.pages.update(slug, body as never)) as { status?: string };
    if (updated?.status && updated.status !== "published") {
      await client.pages.publish(slug);
      console.log(`  republished ${slug}`);
    }
    console.log(`  updated ${slug}`);
  }

  console.log(
    apply ? `done: ${total} replacement(s) written` : `dry run: ${total} replacement(s) pending (use --apply)`,
  );
}

main().catch((error) => {
  console.error("[atlas:patch-brand-name] failed:", error);
  process.exitCode = 1;
});
