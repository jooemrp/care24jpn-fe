/**
 * Brand spelling (decision 2026-11-13): "Care24Japan" / "Care 24 Japan" becomes
 * "Care24 Japan" in every live article entry (ja translation fields).
 * Companion to patch-brand-care24-japan.ts, which only walks pages.
 *
 * Same write shape as patch-article-cta-text.ts: data is read from the delivery
 * API (locale=ja) and written back with the SDK in the editor shape
 * (non-localizable in `data`, localizable in `translations.ja`). Aborts if any
 * entry already has a real en translation. Only entries with a hit are written.
 *
 * Usage (dry run by default; BACKUP_FILE is written before any write):
 *   BACKUP_FILE=<path.json> npx tsx scripts/atlas/patch-article-brand-care24-japan.ts [apply]
 */
import { writeFileSync } from "node:fs";
import { createScriptManagementClient, loadEnv, requireAtlasEnv } from "./lib";

const LOCALIZABLE = ["title", "category", "summary", "lead", "body", "cta_body", "cta_label", "seo_title", "seo_description"];
const BRAND_RE = /Care[  　]*24[  　]*Japan/g;
const BRAND = "Care24 Japan";
const apply = process.argv[2] === "apply";

type Row = { slug: string; updated_at: string; is_fallback?: boolean; data: string | Record<string, unknown> };

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
    const out = value.map((item) => {
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

  let total = 0;
  for (const row of ja) {
    const parsed = typeof row.data === "string" ? (JSON.parse(row.data) as Record<string, unknown>) : { ...row.data };
    const r = rewrite(parsed);
    if (r.hits === 0) continue;
    total += r.hits;
    const data = r.value as Record<string, unknown>;
    const localized: Record<string, unknown> = {};
    const base: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) (LOCALIZABLE.includes(key) ? localized : base)[key] = value;

    console.log(`${row.slug}: ${r.hits} replacement(s)`);
    if (!client) continue;
    await client.entries("article").update(row.slug, {
      data: base,
      translations: { ja: { data: localized } },
      updatedAt: row.updated_at,
    });
    console.log(`  updated ${row.slug}`);
  }
  console.log(apply ? `done: ${total} replacement(s) written` : `dry run: ${total} replacement(s) pending (use apply)`);
}

main().catch((error) => {
  console.error("[atlas:patch-article-brand-care24-japan] failed:", error);
  process.exit(1);
});
