/**
 * Task 19 (client sheet row 21): sync the bottom apply banners to approved copy.
 *
 * The live home-apply block still carries the pre-revision banner wording:
 * the user eyebrow "サービスをご利用されたい方" (approved: "サービスをご利用の
 * 方") and both labels still ending in "こちらから" (Ishihara approved dropping
 * から on the red and blue banners). copy.ts already holds the approved
 * wording; this patch carries it into Atlas without replaying the full seed.
 *
 * Reads the published home page, changes only these three ja fields on the
 * home-apply block, and re-submits the preserved block list with optimistic
 * locking. The en translation row is left untouched (it never carried these
 * fields). Usage: npx tsx scripts/atlas/patch-task19-apply-banners.ts
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
  const targets = blocks.filter((block) => block.type === "home-apply");
  if (targets.length !== 1) {
    throw new Error(`Expected exactly one home-apply block, found ${targets.length}.`);
  }

  return blocks.map((block) => {
    const data = parseObject(block.data);
    const enData = translations.get(block.id);

    if (block.type === "home-apply") {
      Object.assign(data, {
        user_eyebrow: home.apply.user.eyebrow.ja,
        user_label: home.apply.user.label.ja,
        staff_label: home.apply.staff.label.ja,
      });
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
  console.log(
    "updated page/home home-apply banners (ja):",
    JSON.stringify({
      user_eyebrow: home.apply.user.eyebrow.ja,
      user_label: home.apply.user.label.ja,
      staff_label: home.apply.staff.label.ja,
    }),
  );
  console.log("preserved all live blocks and omitted SEO from the update body");
}

main().catch((error) => {
  console.error("[atlas:patch-task19-apply-banners] failed:", error);
  process.exitCode = 1;
});
