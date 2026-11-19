/**
 * Client revision (websiterevisions, row 1): the paragraph under the
 * "Care24Japanとは" heading on the TOP page.
 *
 * Writes `intro` (ja + en) onto the single `home-about` block of the published
 * `home` page. The live homepage can contain dashboard edits, so this reads the
 * current blocks through the delivery API, changes only `intro` on that block,
 * and re-submits the preserved block list with optimistic locking. SEO is
 * omitted and stays untouched.
 *
 * Requires the `intro` field to exist on the `home_about` content type — run
 * `npm run atlas:schema` first (idempotent; it only adds the missing field).
 *
 * Usage: npx tsx scripts/atlas/patch-home-about-intro.ts
 */
import { home } from "../../constants/copy";
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
  const targets = blocks.filter((block) => block.type === "home-about");
  if (targets.length !== 1) {
    throw new Error(`Expected exactly one home-about block, found ${targets.length}.`);
  }

  return blocks.map((block) => {
    const data = parseObject(block.data);
    let enData = translations.get(block.id);

    if (block.type === "home-about") {
      data.intro = home.about.intro.ja;
      enData = { ...(enData ?? {}), intro: home.about.intro.en };
    }

    return {
      block_type_id: block.block_type_id,
      parent_id: null,
      position: block.position,
      data,
      ...(enData ? { translations: { en: { data: enData } } } : {}),
    };
  });
}

async function main(): Promise<void> {
  const page = await fetchPublishedHome();
  const updatedAt = page.page?.updated_at;
  if (!updatedAt) throw new Error("Published homepage has no updated_at for optimistic locking.");

  const blocks = buildPreservedBlocks(page);
  const client = await createScriptManagementClient(120_000);
  await client.pages.update(PAGE_SLUG, { updatedAt, blocks });
  console.log("updated page/home home-about.intro (ja + en)");
  console.log("preserved all live blocks and omitted SEO from the update body");
}

main().catch((error) => {
  console.error("[atlas:patch-home-about-intro] failed:", error);
  process.exitCode = 1;
});
