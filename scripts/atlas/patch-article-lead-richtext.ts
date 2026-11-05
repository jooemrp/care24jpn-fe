/**
 * Client revision: the article `lead` field becomes a rich-text editor.
 * Converts each live article's plain-text lead (paragraphs split by a blank
 * line) into `<p>` HTML. Entries whose lead already starts with `<` are left
 * alone, so the script is safe to re-run. Run it AFTER the field type is
 * changed to richtext in Atlas and BEFORE deploying the marketing-web change
 * (the site shows a field diagnostic for a lead it cannot parse).
 *
 * Reads current data from the delivery API (locale=ja) and writes back with
 * the SDK in the editor shape, like patch-article-cta-text.ts. Refuses to run
 * if any entry already has a real en translation.
 *
 * Usage (dry run by default; BACKUP_FILE is written before any write):
 *   BACKUP_FILE=<path.json> npx tsx scripts/atlas/patch-article-lead-richtext.ts [apply]
 */
import { writeFileSync } from "node:fs";
import { blocksToHtml } from "../../features/cms/legal-html";
import { createScriptManagementClient, loadEnv, requireAtlasEnv } from "./lib";

const LOCALIZABLE = ["title", "category", "summary", "lead", "body", "cta_body", "cta_label", "seo_title", "seo_description"];
const apply = process.argv[2] === "apply";

type Row = { slug: string; updated_at: string; is_fallback?: boolean; data: string | Record<string, unknown> };

/** Exported for offline tests. Returns null when the lead needs no change. */
export function leadToHtml(lead: unknown): string | null {
  if (typeof lead !== "string" || !lead.trim() || lead.trimStart().startsWith("<")) return null;
  const paragraphs = lead.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return blocksToHtml(paragraphs.map((text) => ({ type: "p" as const, text })));
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

  for (const row of ja) {
    const data = typeof row.data === "string" ? (JSON.parse(row.data) as Record<string, unknown>) : { ...row.data };
    const html = leadToHtml(data.lead);
    if (html === null) {
      console.log(`- skip ${row.slug} (lead empty or already HTML)`);
      continue;
    }
    data.lead = html;
    const localized: Record<string, unknown> = {};
    const base: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) (LOCALIZABLE.includes(key) ? localized : base)[key] = value;

    if (!client) {
      console.log(`~ would update ${row.slug}`);
      continue;
    }
    await client.entries("article").update(row.slug, {
      data: base,
      translations: { ja: { data: localized } },
      updatedAt: row.updated_at,
    });
    console.log(`= updated ${row.slug}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
