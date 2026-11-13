/**
 * Logo alt (JA) spelling: the `site` page's brand block still carries
 * `logo_alt` = "ケア24ジャパン ロゴ" (katakana). Google reads that alt text as
 * page content (it shows up in FAQ/terms snippets), so it keeps a second
 * spelling of the brand alive. It becomes "Care24Japan ロゴ".
 *
 * Only the JA base value of `logo_alt` in the `site` page changes. Every other
 * block, the EN translations and the page SEO are re-submitted exactly as read
 * (optimistic locking via updatedAt), the same way patch-brand-name.ts does.
 *
 * Usage:
 *   npx tsx scripts/atlas/patch-logo-alt-ja.ts           # dry run
 *   npx tsx scripts/atlas/patch-logo-alt-ja.ts --apply   # writes + keeps published
 */
import { createScriptManagementClient, loadEnv, requireAtlasEnv } from "./lib";

const SLUG = "site";
const FIELD = "logo_alt";
const FROM = "ケア24ジャパン ロゴ";
const TO = "Care24Japan ロゴ";

type RawBlock = {
  id: string;
  block_type_id: string;
  position: number;
  data: string | Record<string, unknown>;
};

type RawBlockTranslation = {
  block_id: string;
  locale: string;
  data: string | Record<string, unknown>;
};

type RawPageResponse = {
  page?: { updated_at?: string; status?: string };
  blocks?: RawBlock[];
  block_translations?: RawBlockTranslation[];
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

async function readPage(): Promise<RawPageResponse> {
  const { baseUrl } = requireAtlasEnv();
  const key = process.env.ATLAS_API_KEY;
  if (!key) throw new Error("ATLAS_API_KEY is required for the read-before-write step.");
  const res = await fetch(`${baseUrl}/api/v1/public/pages/${SLUG}`, {
    headers: { "X-API-Key": key },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GET /pages/${SLUG} -> HTTP ${res.status}`);
  const body = (await res.json()) as { success?: boolean; data?: RawPageResponse };
  if (!body.success || !body.data) throw new Error(`GET /pages/${SLUG} -> success=false`);
  return body.data;
}

async function main(): Promise<void> {
  loadEnv();
  const apply = process.argv.includes("--apply");

  const page = await readPage();
  const updatedAt = page.page?.updated_at;
  if (!updatedAt || !page.blocks) throw new Error(`Incomplete published page (${SLUG}).`);

  const enByBlock = new Map<string, Record<string, unknown>>();
  for (const row of page.block_translations ?? []) {
    if (row.locale === "en") enByBlock.set(row.block_id, parseObject(row.data));
  }

  let hits = 0;
  const blocks = page.blocks.map((block) => {
    const data = parseObject(block.data);
    if (data[FIELD] === FROM) {
      data[FIELD] = TO;
      hits += 1;
    } else if (typeof data[FIELD] === "string") {
      console.log(`  ${FIELD} already "${String(data[FIELD])}" (block ${block.id}) — left as is`);
    }
    const enData = enByBlock.get(block.id);
    return {
      block_type_id: block.block_type_id,
      parent_id: null,
      position: block.position,
      data,
      ...(enData ? { translations: { en: { data: enData } } } : {}),
    };
  });

  console.log(`${SLUG}: ${hits} replacement(s) of ${FIELD} "${FROM}" -> "${TO}"`);
  if (hits === 0) return;
  if (!apply) {
    console.log("dry run: nothing written (use --apply)");
    return;
  }

  const client = await createScriptManagementClient(120_000);
  const updated = (await client.pages.update(SLUG, { updatedAt, blocks } as never)) as {
    status?: string;
  };
  if (updated?.status && updated.status !== "published") {
    await client.pages.publish(SLUG);
    console.log(`  republished ${SLUG}`);
  }
  console.log(`done: ${hits} replacement(s) written`);
}

main().catch((error) => {
  console.error("[atlas:patch-logo-alt-ja] failed:", error);
  process.exitCode = 1;
});
