/**
 * Adds the homepage revision fields to the already-published `home` page
 * without replaying the full seed-home payload.
 *
 * The live homepage can contain dashboard edits, so this script reads the
 * current blocks through the delivery API, changes only fields introduced by
 * the mobile-copy/CTA migration plus the approved hero media, and updates the
 * complete preserved block list with optimistic locking. SEO is omitted and
 * remains untouched.
 *
 * Usage: npx tsx scripts/atlas/patch-home-revision-fields.ts
 */
import { home } from "../../constants/copy";
import {
  createScriptManagementClient,
  loadEnv,
  readMediaManifest,
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

function buildPreservedBlocks(page: RawPageResponse, heroMediaId: string) {
  const blocks = page.blocks ?? [];
  const translations = new Map(
    (page.block_translations ?? [])
      .filter((row) => row.locale === "en")
      .map((row) => [row.block_id, parseObject(row.data)]),
  );
  const targets = new Set([
    "home-hero",
    "home-pricing-summary",
    "home-nursing-course",
    "home-apply",
    "home-contact",
  ]);
  for (const type of targets) {
    if (blocks.filter((block) => block.type === type).length !== 1) {
      throw new Error(`Expected exactly one ${type} block.`);
    }
  }

  return blocks.map((block) => {
    const data = parseObject(block.data);
    const enData = translations.get(block.id);

    if (block.type === "home-hero") {
      Object.assign(data, { image: heroMediaId });
    }

    if (block.type === "home-pricing-summary") {
      Object.assign(data, {
        payment_body_mobile: home.pricingSummary.payment.bodyMobile.ja,
        pricing_details_label_mobile: home.pricingDetailsLinkMobile.ja,
      });
      if (enData) {
        Object.assign(enData, {
          payment_body_mobile: home.pricingSummary.payment.bodyMobile.en,
          pricing_details_label_mobile: home.pricingDetailsLinkMobile.en,
        });
      }
    }

    if (block.type === "home-nursing-course") {
      Object.assign(data, { medical_note_mobile: home.nursingCourse.medicalNoteMobile.ja });
      if (enData) Object.assign(enData, { medical_note_mobile: home.nursingCourse.medicalNoteMobile.en });
    }

    if (block.type === "home-apply") {
      Object.assign(data, { consult_body_mobile: home.apply.consult.bodyMobile.ja });
      if (enData) Object.assign(enData, { consult_body_mobile: home.apply.consult.bodyMobile.en });
    }

    if (block.type === "home-contact") {
      Object.assign(data, { mics_href: home.contact.micsHref });
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
  const heroMedia = readMediaManifest()?.assets["revision/_hero-preview.png"];
  if (!heroMedia?.id) {
    throw new Error(
      'Media manifest is missing "revision/_hero-preview.png". Run scripts/atlas/upload-media.ts first.',
    );
  }

  const page = await fetchPublishedHome();
  const updatedAt = page.page?.updated_at;
  if (!updatedAt) throw new Error("Published homepage has no updated_at for optimistic locking.");

  const blocks = buildPreservedBlocks(page, heroMedia.id);
  const client = await createScriptManagementClient(120_000);
  await client.pages.update(PAGE_SLUG, { updatedAt, blocks });
  console.log(
    "updated page/home revision fields: hero.image, payment_body_mobile, pricing_details_label_mobile, medical_note_mobile, consult_body_mobile, mics_href",
  );
  console.log("preserved all live blocks and omitted SEO from the update body");
}

main().catch((error) => {
  console.error("[atlas:patch-home-revision-fields] failed:", error);
  process.exitCode = 1;
});
