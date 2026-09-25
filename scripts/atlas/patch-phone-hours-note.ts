/**
 * New client request (phone-hours disclaimer): add
 *   ※お電話での登録や予約のご対応は午前9時〜午後6時となります。
 * in three UI places from two CMS fields —
 *   1. Navbar phone block          -> site/site-contact-phone `phone_note`
 *   2. sticky CTA bar phone button -> site/site-contact-phone `phone_note`
 *   3. contact page phone card     -> contact/contact-phone-card `note`
 *
 * Writes the JA string into each block's base data (the merge layer mirrors
 * it to `en` until a real translation exists) and re-submits each page's
 * preserved block list with optimistic locking.
 *
 * Usage: npx tsx scripts/atlas/patch-phone-hours-note.ts
 */
import {
  createScriptManagementClient,
  loadEnv,
  requireAtlasEnv,
} from "./lib";

const NOTE = "※お電話での登録や予約のご対応は午前9時〜午後6時となります。";

const TARGETS: { page: string; blockType: string; field: string }[] = [
  { page: "site", blockType: "site-contact-phone", field: "phone_note" },
  { page: "contact", blockType: "contact-phone-card", field: "note" },
];

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

async function fetchPublishedPage(slug: string): Promise<RawPageResponse> {
  const env = requireAtlasEnv();
  const deliveryKey = process.env.ATLAS_API_KEY;
  if (!deliveryKey) {
    throw new Error("ATLAS_API_KEY is required for the read-before-write step.");
  }

  const response = await fetch(`${env.baseUrl}/api/v1/public/pages/${slug}`, {
    headers: { "X-API-Key": deliveryKey },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`GET /api/v1/public/pages/${slug} -> HTTP ${response.status}`);
  }

  const envelope = (await response.json()) as { success?: boolean; data?: RawPageResponse };
  if (!envelope.success || !envelope.data?.page || !envelope.data.blocks) {
    throw new Error(`Atlas returned an incomplete published page (${slug}).`);
  }
  return envelope.data;
}

async function main(): Promise<void> {
  loadEnv();
  const client = await createScriptManagementClient(120_000);

  for (const target of TARGETS) {
    const page = await fetchPublishedPage(target.page);
    const updatedAt = page.page?.updated_at;
    if (!updatedAt) {
      throw new Error(`Page ${target.page} has no updated_at for optimistic locking.`);
    }

    const translations = new Map(
      (page.block_translations ?? [])
        .filter((row) => row.locale === "en")
        .map((row) => [row.block_id, parseObject(row.data)]),
    );

    const hits = (page.blocks ?? []).filter((block) => block.type === target.blockType);
    if (hits.length !== 1) {
      throw new Error(
        `Expected exactly one ${target.blockType} block on ${target.page}, found ${hits.length}.`,
      );
    }

    const blocks = (page.blocks ?? []).map((block) => {
      const data = parseObject(block.data);
      const enData = translations.get(block.id);
      if (block.type === target.blockType) {
        Object.assign(data, { [target.field]: NOTE });
      }
      return {
        block_type_id: block.block_type_id,
        parent_id: null,
        position: block.position,
        data,
        ...(enData ? { translations: { en: { data: enData } } } : {}),
      };
    });

    await client.pages.update(target.page, { updatedAt, blocks });
    console.log(`updated ${target.page}/${target.blockType}.${target.field}`);
  }

  console.log("preserved all live blocks and omitted SEO from every update body");
}

main().catch((error) => {
  console.error("[atlas:patch-phone-hours-note] failed:", error);
  process.exitCode = 1;
});
