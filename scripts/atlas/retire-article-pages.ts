/** One-off retirement after schema + entry/hub seeding, run manually:
 * node --import tsx scripts/atlas/retire-article-pages.ts --dry-run
 * node --import tsx scripts/atlas/retire-article-pages.ts --remove-block-types --dry-run
 * node --import tsx scripts/atlas/retire-article-pages.ts --remove-block-types
 * Only seed-listed article-* pages are deleted. The hub and all entries stay.
 * Retired block types are removed only after their usage is empty, including
 * draft/unpublished pages. The backend repeats the usage guard on deletion.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createScriptManagementClient, requireAtlasEnv, getContentType,
  getBlockTypeUsage, deleteContentType, type BlockTypeUsage,
} from "./lib";

const RETIRED_TYPES = ["article-meta", "article-body", "article-cta", "article-ref"] as const;
const seed: unknown = JSON.parse(readFileSync(resolve(__dirname, "articles.seed.json"), "utf8"));
if (!Array.isArray(seed) || seed.length !== 11 || !seed.every((item) =>
  item && typeof item.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug),
)) throw new Error("Invalid eleven-article retirement allowlist; refusing deletion.");
const retiredPages = seed.map((item: { slug: string }) => `article-${item.slug}`);
if (new Set(retiredPages).size !== 11) throw new Error("Duplicate retirement allowlist slugs.");

interface RetirementOptions {
  dryRun: boolean;
  removeBlockTypes: boolean;
  deletePage: (slug: string) => Promise<unknown>;
  getType: (slug: string) => Promise<{ is_block: boolean } | null>;
  getUsage: (slug: string) => Promise<BlockTypeUsage>;
  deleteType: (slug: string) => Promise<unknown>;
  log: (line: string) => void;
}

function isGone(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 404);
}

/** Injected operations allow offline safety tests with no live CMS access. */
export async function retireArticlePages(options: RetirementOptions): Promise<{ blocked: boolean }> {
  const { log, dryRun } = options;
  const prefix = dryRun ? "[dry-run]" : "[delete]";
  log(`${prefix} Allowlisted pages (${retiredPages.length}): ${retiredPages.join(", ")}`);
  if (options.removeBlockTypes) log(`${prefix} Retired block type candidates: ${RETIRED_TYPES.join(", ")}`);
  for (const slug of retiredPages) {
    if (!slug.startsWith("article-") || !retiredPages.includes(slug)) throw new Error(`Refusing non-allowlisted page ${slug}`);
    log(`${prefix} page ${slug}`);
    if (!dryRun) {
      try { await options.deletePage(slug); }
      catch (error) {
        if (!isGone(error)) throw error;
        log(`[already gone] page ${slug}`);
      }
    }
  }
  let blocked = false;
  if (options.removeBlockTypes) for (const slug of RETIRED_TYPES) {
    const type = await options.getType(slug);
    if (!type) { log(`[already gone] block type ${slug}`); continue; }
    if (!type.is_block) throw new Error(`${slug} is not a block type; refusing deletion.`);
    const usage = await options.getUsage(slug);
    // Dry run projects only these allowlisted page deletions. References in
    // the hub or any other page still block removal until manually resolved.
    const remaining = dryRun ? usage.pages.filter((page) => !retiredPages.includes(page.slug)) : usage.pages;
    if (remaining.length > 0) {
      blocked = true;
      log(`[retained] ${slug}: used by ${remaining.map((page) => page.slug).join(", ")}`);
      continue;
    }
    log(`${prefix} block type ${slug} (no remaining page usage)`);
    if (!dryRun) {
      try { await options.deleteType(slug); }
      catch (error) { if (!isGone(error)) throw error; }
    }
  }
  return { blocked };
}

async function main(): Promise<void> {
  const flags = process.argv.slice(2);
  if (flags.some((flag) => flag !== "--dry-run" && flag !== "--remove-block-types")) {
    throw new Error("Supported flags: --dry-run, --remove-block-types");
  }
  const env = requireAtlasEnv();
  const client = await createScriptManagementClient();
  const result = await retireArticlePages({
    dryRun: flags.includes("--dry-run"), removeBlockTypes: flags.includes("--remove-block-types"),
    deletePage: (slug) => client.pages.delete(slug),
    getType: (slug) => getContentType(env, slug),
    getUsage: (slug) => getBlockTypeUsage(env, slug),
    deleteType: (slug) => deleteContentType(env, slug), log: console.log,
  });
  if (result.blocked) process.exitCode = 1;
}

if (require.main === module) main().catch((error) => {
  console.error("[atlas:retire-article-pages] failed:", error);
  process.exitCode = 1;
});
