/**
 * Client revision (ClickUp #2, 2026-11-19), article CTA button labels:
 *
 *  1. `cta_label` ends in a doubled 「こちらこちら」 on the live articles; it
 *     becomes a single 「こちら」.
 *  2. `cta_label_short` (new optional field, phones only) is filled where it
 *     is still empty, using the client's own rule from her example
 *     ("Care24Japanの「自費介護サービス」の詳細はこちら" -> "自費介護サービスの詳細はこちら"):
 *     drop the leading brand ("Care24Japanの" / "Care24Japanへの", any
 *     spacing) and the 「」 brackets. A short label an editor already typed is
 *     never overwritten. Review the dry-run list with the client before apply;
 *     every value stays editable in the CMS afterwards.
 *
 * Run `pnpm atlas:schema` first so the `cta_label_short` field exists.
 * Same write shape as patch-article-cta-text.ts: data is read from the
 * delivery API (locale=ja) and written back with the SDK in the editor shape
 * (non-localizable in `data`, localizable in `translations.ja`). Aborts if any
 * entry already has a real en translation. Only entries with a change are written.
 *
 * Usage (dry run by default; BACKUP_FILE is written before any write):
 *   BACKUP_FILE=<path.json> npx tsx scripts/atlas/patch-article-cta-label.ts [apply]
 */
import { writeFileSync } from "node:fs";
import { createScriptManagementClient, loadEnv, requireAtlasEnv } from "./lib";

const LOCALIZABLE = ["title", "category", "summary", "lead", "body", "cta_body", "cta_label", "cta_label_short", "seo_title", "seo_description"];
const apply = process.argv[2] === "apply";

type Row = { slug: string; updated_at: string; is_fallback?: boolean; data: string | Record<string, unknown> };

/** 「…はこちらこちら」 -> 「…はこちら」. Exported for tests. */
export function fixDoubledKochira(label: string): string {
  return label.replace(/(?:こちら){2,}(\s*)$/, "こちら$1");
}

/** The client's phone rule: no leading brand, no 「」. Exported for tests. */
export function shortLabel(label: string): string {
  return fixDoubledKochira(label)
    .replace(/^\s*Care\s*24\s*Japan\s*(?:への|の)/, "")
    .replace(/[「」]/g, "")
    .trim();
}

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

  let changed = 0;
  for (const row of ja) {
    const data = typeof row.data === "string" ? (JSON.parse(row.data) as Record<string, unknown>) : { ...row.data };
    const label = typeof data.cta_label === "string" ? data.cta_label : "";
    const current = typeof data.cta_label_short === "string" ? data.cta_label_short.trim() : "";
    if (!label) continue;
    const nextLabel = fixDoubledKochira(label);
    const nextShort = current || shortLabel(label);
    if (nextLabel === label && nextShort === current) continue;
    changed += 1;
    data.cta_label = nextLabel;
    data.cta_label_short = nextShort;
    console.log(`${row.slug}\n  label: ${label} -> ${nextLabel}\n  phone: ${current || "(empty)"} -> ${nextShort}`);
    if (!client) continue;

    const localized: Record<string, unknown> = {};
    const base: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) (LOCALIZABLE.includes(key) ? localized : base)[key] = value;
    await client.entries("article").update(row.slug, {
      data: base,
      translations: { ja: { data: localized } },
      updatedAt: row.updated_at,
    });
    console.log(`  updated ${row.slug}`);
  }
  console.log(apply ? `done: ${changed} article(s) written` : `dry run: ${changed} article(s) would change (use apply)`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[atlas:patch-article-cta-label] failed:", error);
    process.exit(1);
  });
}
