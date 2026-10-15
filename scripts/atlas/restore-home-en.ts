/**
 * Restores the EN translation rows of the published `home` page.
 *
 * Background: after `patch-home-about-intro.ts` the live `home` page carried a
 * single EN translation row (the new `intro`), so every other block mirrored
 * its JA text on /en. This script refills EN from `constants/copy.ts#home`
 * WITHOUT touching any JA value:
 *
 *  - each live block's JA string field is matched BY VALUE to a `{ ja, en }`
 *    pair in `home` (multi-line, one-item-per-line fields are matched line by
 *    line). A field whose JA text differs from copy.ts (e.g. edited in the
 *    dashboard) or is ambiguous (same JA, different EN) is NOT written — it is
 *    reported and keeps mirroring JA.
 *  - an EN value that already exists on the block is never overwritten.
 *  - the live block list is re-submitted unchanged otherwise (JA data, order,
 *    media ids), with optimistic locking; SEO is omitted from the update body.
 *
 * Default is a dry run. Pass `--apply` to write.
 *
 * Usage:
 *   npx tsx scripts/atlas/restore-home-en.ts            # dry run
 *   npx tsx scripts/atlas/restore-home-en.ts --apply
 */
import { home } from "../../constants/copy";
import { createScriptManagementClient, loadEnv, requireAtlasEnv } from "./lib";

const PAGE_SLUG = "home";
const APPLY = process.argv.includes("--apply");

type RawBlock = {
  id: string;
  block_type_id: string;
  position: number;
  data: string | Record<string, unknown>;
  type: string;
};
type RawTranslation = {
  block_id: string;
  locale: string;
  data: string | Record<string, unknown>;
};
type RawPageResponse = {
  page?: { updated_at?: string; status?: string };
  blocks?: RawBlock[];
  block_translations?: RawTranslation[];
};

function parseObject(value: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return { ...value };
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Atlas returned a non-object block payload.");
  }
  return { ...(parsed as Record<string, unknown>) };
}

async function fetchPublishedHome(): Promise<RawPageResponse> {
  loadEnv();
  const env = requireAtlasEnv();
  const deliveryKey = process.env.ATLAS_API_KEY;
  if (!deliveryKey) throw new Error("ATLAS_API_KEY is required for the read-before-write step.");

  const response = await fetch(`${env.baseUrl}/api/v1/public/pages/${PAGE_SLUG}?cb=${Date.now()}`, {
    headers: { "X-API-Key": deliveryKey },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GET /api/v1/public/pages/${PAGE_SLUG} -> HTTP ${response.status}`);

  const envelope = (await response.json()) as { success?: boolean; data?: RawPageResponse };
  if (!envelope.success || !envelope.data?.page || !envelope.data.blocks) {
    throw new Error("Atlas returned an incomplete published homepage.");
  }
  return envelope.data;
}

// ---------------------------------------------------------------------------
// JA -> EN index built from every `{ ja, en }` pair under `constants/copy.ts#home`
// ---------------------------------------------------------------------------

function isBilingual(value: unknown): value is { ja: string; en: string } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.ja === "string" && typeof v.en === "string";
}

/** `bodyMobile` -> `body_mobile`, to compare against CMS field keys. */
function snake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** ja text -> (en text -> copy.ts property names that carry that pair). */
const pairs = new Map<string, Map<string, Set<string>>>();

function addPair(ja: string, en: string, key: string): void {
  if (ja.trim() === "") return;
  const byEn = pairs.get(ja) ?? new Map<string, Set<string>>();
  const keys = byEn.get(en) ?? new Set<string>();
  keys.add(snake(key));
  byEn.set(en, keys);
  pairs.set(ja, byEn);
}

function collectPairs(node: unknown, key: string): void {
  if (isBilingual(node)) {
    addPair(node.ja, node.en, key);
    return;
  }
  if (Array.isArray(node)) {
    // "One item per line" textarea fields are the joined form of a list.
    if (node.length > 0 && node.every(isBilingual)) {
      addPair(node.map((n) => n.ja).join("\n"), node.map((n) => n.en).join("\n"), key);
    }
    const objects = node.filter((n): n is Record<string, unknown> => !!n && typeof n === "object" && !Array.isArray(n));
    if (objects.length === node.length && node.length > 0) {
      for (const prop of new Set(objects.flatMap((o) => Object.keys(o)))) {
        const column = objects.map((o) => o[prop]);
        if (column.every(isBilingual)) {
          addPair(column.map((n) => n.ja).join("\n"), column.map((n) => n.en).join("\n"), prop);
        }
      }
    }
    for (const item of node) collectPairs(item, key);
    return;
  }
  if (node && typeof node === "object") {
    for (const [prop, value] of Object.entries(node)) collectPairs(value, prop);
  }
}

collectPairs(home, "home");

type Match = { en: string } | { ambiguous: string[] } | null;

/** `fieldKey` (the CMS field, e.g. `payment_body_mobile`) breaks ties between
 * two pairs with the same JA text by matching the copy.ts property name. */
function lookup(ja: string, fieldKey: string): Match {
  const byEn = pairs.get(ja);
  if (!byEn) return null;
  if (byEn.size === 1) return { en: [...byEn.keys()][0]! };
  const scored = [...byEn].map(([en, keys]) => ({
    en,
    score: Math.max(0, ...[...keys].filter((k) => fieldKey.endsWith(k)).map((k) => k.length)),
  }));
  const top = Math.max(...scored.map((c) => c.score));
  const best = scored.filter((c) => c.score === top);
  if (top > 0 && best.length === 1) return { en: best[0]!.en };
  return { ambiguous: [...byEn.keys()] };
}

/** Matches a whole field, then falls back to line-by-line (greedy, longest
 * run of lines first) for the "one item per line" textarea fields. */
function matchField(ja: string, fieldKey: string): Match {
  const whole = lookup(ja, fieldKey);
  if (whole) return whole;
  if (!ja.includes("\n")) return null;

  const lines = ja.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let matched = false;
    for (let k = lines.length - i; k >= 1; k--) {
      const hit = lookup(lines.slice(i, i + k).join("\n"), fieldKey);
      if (hit && "ambiguous" in hit) return hit;
      if (hit) {
        out.push(hit.en);
        i += k;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }
  return { en: out.join("\n") };
}

// ---------------------------------------------------------------------------

function buildBlocks(page: RawPageResponse) {
  const existingEn = new Map(
    (page.block_translations ?? [])
      .filter((row) => row.locale === "en")
      .map((row) => [row.block_id, parseObject(row.data)]),
  );
  const report = { restored: 0, kept: 0, unmatched: [] as string[], ambiguous: [] as string[] };

  const blocks = (page.blocks ?? []).map((block) => {
    const data = parseObject(block.data);
    const enData: Record<string, unknown> = { ...(existingEn.get(block.id) ?? {}) };

    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== "string" || value.trim() === "") continue;
      if (typeof enData[key] === "string") {
        report.kept++;
        continue;
      }
      const hit = matchField(value, key);
      if (hit && "en" in hit) {
        enData[key] = hit.en;
        report.restored++;
      } else if (hit) {
        report.ambiguous.push(`${block.type}#${block.position}.${key}`);
      } else {
        report.unmatched.push(`${block.type}#${block.position}.${key} = ${JSON.stringify(value.slice(0, 50))}`);
      }
    }

    return {
      block_type_id: block.block_type_id,
      parent_id: null,
      position: block.position,
      data,
      ...(Object.keys(enData).length > 0 ? { translations: { en: { data: enData } } } : {}),
    };
  });

  return { blocks, report };
}

async function main(): Promise<void> {
  const page = await fetchPublishedHome();
  const updatedAt = page.page?.updated_at;
  if (!updatedAt) throw new Error("Published homepage has no updated_at for optimistic locking.");

  const { blocks, report } = buildBlocks(page);
  const withEn = blocks.filter((b) => "translations" in b).length;
  console.log(`blocks: ${blocks.length}, with EN after restore: ${withEn}`);
  console.log(`EN fields restored: ${report.restored}, already had EN (kept): ${report.kept}`);
  console.log(`ambiguous (not written): ${report.ambiguous.length}`);
  for (const line of report.ambiguous) console.log("  ~", line);
  console.log(`JA text with no copy.ts match (left mirroring JA): ${report.unmatched.length}`);
  for (const line of report.unmatched) console.log("  ?", line);

  if (!APPLY) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply to write.");
    return;
  }

  const client = await createScriptManagementClient(120_000);
  await client.pages.update(PAGE_SLUG, { updatedAt, blocks });
  console.log("\nupdated page/home EN translations (JA untouched, SEO omitted)");
}

main().catch((error) => {
  console.error("[atlas:restore-home-en] failed:", error);
  process.exitCode = 1;
});
