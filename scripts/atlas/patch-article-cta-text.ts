/**
 * Client revision (Ishihara-san, 2026-10-29): every article's closing CTA text
 * becomes one shared paragraph (seed: articles.seed.json `cta.body`).
 * Rewrites only `cta_body` of the ja translation on each live article entry.
 * The management GET route is unavailable on the live backend, so current data
 * is read from the delivery API (locale=ja) and written back with the SDK in
 * the editor shape (non-localizable in `data`, localizable in
 * `translations.ja`). Aborts if any entry already has a real en translation.
 *
 * Usage (dry run by default; BACKUP_FILE is written before any write):
 *   BACKUP_FILE=<path.json> npx tsx scripts/atlas/patch-article-cta-text.ts [apply]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { blocksToHtml } from "../../features/cms/legal-html";
import { createScriptManagementClient, loadEnv, requireAtlasEnv } from "./lib";

const LOCALIZABLE = ["title", "category", "summary", "lead", "body", "cta_body", "cta_label", "seo_title", "seo_description"];
const apply = process.argv[2] === "apply";

type Row = { slug: string; updated_at: string; is_fallback?: boolean; data: string | Record<string, unknown> };
const seed = JSON.parse(readFileSync(resolve(__dirname, "articles.seed.json"), "utf8")) as {
  slug: string;
  cta: { body: Parameters<typeof blocksToHtml>[0] };
}[];

async function list(locale: string): Promise<Row[]> {
  const base = process.env.ATLAS_BASE_URL!.replace(/\/$/, "");
  const res = await fetch(`${base}/api/v1/public/entries?type=article&limit=50&locale=${locale}`, {
    headers: { "X-API-Key": process.env.ATLAS_API_KEY! },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Delivery list failed (${res.status})`);
  const json = (await res.json()) as { data?: { items?: Row[] } | Row[] };
  return Array.isArray(json.data) ? json.data : (json.data?.items ?? []);
}

async function main(): Promise<void> {
  loadEnv();
  requireAtlasEnv();
  const backupFile = process.env.BACKUP_FILE;
  if (apply && !backupFile) throw new Error("Set BACKUP_FILE for the pre-change backup.");

  const [ja, en] = await Promise.all([list("ja"), list("en")]);
  if (!en.every((row) => row.is_fallback === true)) {
    throw new Error("An entry already has an en translation row; refusing to overwrite.");
  }
  if (backupFile) writeFileSync(backupFile, JSON.stringify(ja, null, 2));
  const client = apply ? await createScriptManagementClient(120_000) : null;

  for (const article of seed) {
    const row = ja.find((entry) => entry.slug === article.slug);
    if (!row) {
      console.log(`- skip ${article.slug} (not in delivery list)`);
      continue;
    }
    const data = typeof row.data === "string" ? (JSON.parse(row.data) as Record<string, unknown>) : { ...row.data };
    data.cta_body = blocksToHtml(article.cta.body);
    const localized: Record<string, unknown> = {};
    const base: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) (LOCALIZABLE.includes(key) ? localized : base)[key] = value;

    if (!client) {
      console.log(`~ would update ${article.slug} (base: ${Object.keys(base)}; ja: ${Object.keys(localized)})`);
      continue;
    }
    await client.entries("article").update(article.slug, {
      data: base,
      translations: { ja: { data: localized } },
      updatedAt: row.updated_at,
    });
    console.log(`= updated ${article.slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
