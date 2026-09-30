/**
 * Task 14 (client sheet (7) row 16, J16): drop the hardcoded line breaks from
 * the ISMS statement.
 *
 * The live `home-contact.isms` field still carries the early-revision break
 * "情報セキュリティ\nマネジメントシステム", which splits one compound word on
 * desktop. J16 asks for phrase-based wrapping at every width with no
 * hardcoded breaks; `<PhraseText>` now does that, so the field only needs its
 * `\n`s removed. The rest of the live wording is kept exactly as published.
 *
 * Reads the published home page, changes only `isms` (ja) on the home-contact
 * block, and re-submits the preserved block list with optimistic locking.
 * Usage: npx tsx scripts/atlas/patch-task14-isms-breaks.ts
 */
import {
  createScriptManagementClient,
  loadEnv,
  requireAtlasEnv,
} from "./lib";

const PAGE_SLUG = "home";

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
  if (!deliveryKey) {
    throw new Error("ATLAS_API_KEY is required for the read-before-write step.");
  }

  const response = await fetch(`${env.baseUrl}/api/v1/public/pages/${PAGE_SLUG}`, {
    headers: { "X-API-Key": deliveryKey },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`GET /api/v1/public/pages/${PAGE_SLUG} -> HTTP ${response.status}`);
  }

  const envelope = (await response.json()) as { success?: boolean; data?: RawPageResponse };
  if (!envelope.success || !envelope.data?.page || !envelope.data.blocks) {
    throw new Error("Atlas returned an incomplete published homepage.");
  }
  return envelope.data;
}

function buildPreservedBlocks(page: RawPageResponse) {
  const blocks = page.blocks ?? [];
  const translations = new Map(
    (page.block_translations ?? [])
      .filter((row) => row.locale === "en")
      .map((row) => [row.block_id, parseObject(row.data)]),
  );
  const targets = blocks.filter((block) => block.type === "home-contact");
  if (targets.length !== 1) {
    throw new Error(`Expected exactly one home-contact block, found ${targets.length}.`);
  }

  let before = "";
  let after = "";
  const preserved = blocks.map((block) => {
    const data = parseObject(block.data);
    const enData = translations.get(block.id);

    if (block.type === "home-contact") {
      if (typeof data.isms !== "string" || !data.isms.trim()) {
        throw new Error("Live home-contact.isms is missing; refusing to write.");
      }
      before = data.isms;
      after = before.replace(/\s*\n\s*/g, "");
      data.isms = after;
    }

    return {
      block_type_id: block.block_type_id,
      parent_id: null,
      position: block.position,
      data,
      ...(enData ? { translations: { en: { data: enData } } } : {}),
    };
  });
  return { preserved, before, after };
}

async function main(): Promise<void> {
  const page = await fetchPublishedHome();
  const updatedAt = page.page?.updated_at;
  if (!updatedAt) throw new Error("Published homepage has no updated_at for optimistic locking.");

  const { preserved, before, after } = buildPreservedBlocks(page);
  if (before === after) {
    console.log("home-contact.isms has no line breaks; nothing to do.");
    return;
  }

  const client = await createScriptManagementClient(120_000);
  await client.pages.update(PAGE_SLUG, { updatedAt, blocks: preserved });
  console.log("updated page/home home-contact.isms (ja)");
  console.log("  before:", JSON.stringify(before));
  console.log("  after: ", JSON.stringify(after));
}

main().catch((error) => {
  console.error("[atlas:patch-task14-isms-breaks] failed:", error);
  process.exitCode = 1;
});
