/**
 * Client request (Oct 2026): the main pink apply button becomes
 * "ご登録・お申込みはこちら" and a second button for returning users
 * ("2回目以降のご予約はこちら") sits directly under it.
 *
 *   home/home-apply  user_label           -> new pink-button text (ja + en)
 *   home/home-apply  user_repeat_eyebrow  -> new field (ja + en)
 *   home/home-apply  user_repeat_label    -> new field (ja + en)
 *   home/home-apply  user_repeat_href     -> returning-user Google Form
 *
 * Prerequisite: `npm run atlas:schema` so the three user_repeat_* fields exist
 * on the home_apply content type. Re-submits the preserved block list with
 * optimistic locking; SEO is omitted and untouched.
 *
 * Usage: npx tsx scripts/atlas/patch-user-repeat-button.ts
 */
import { home } from "../../constants/copy";
import { createScriptManagementClient, loadEnv, requireAtlasEnv } from "./lib";

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

  const { user, userRepeat } = home.apply;
  return blocks.map((block) => {
    const data = parseObject(block.data);
    const enData = translations.get(block.id);

    if (block.type === "home-apply") {
      Object.assign(data, {
        user_label: user.label.ja,
        user_repeat_eyebrow: userRepeat.eyebrow.ja,
        user_repeat_label: userRepeat.label.ja,
        user_repeat_href: userRepeat.href,
      });
      // The live block currently has no en translation row at all (en pages
      // serve the ja text). Only update an existing row: creating a partial
      // one would flip every other home-apply field from "fall back to ja"
      // to "missing in en".
      if (enData) {
        Object.assign(enData, {
          user_label: user.label.en,
          user_repeat_eyebrow: userRepeat.eyebrow.en,
          user_repeat_label: userRepeat.label.en,
        });
      }
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
  console.log("updated page/home home-apply: user_label + user_repeat_{eyebrow,label,href}");
  console.log("preserved all live blocks and omitted SEO from the update body");
}

main().catch((error) => {
  console.error("[atlas:patch-user-repeat-button] failed:", error);
  process.exitCode = 1;
});
