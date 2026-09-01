/**
 * Seeds the "faq" page — page_hero (heading/body) + one `faq_category`
 * block per grouping + one `faq_item` block per Q/A — from
 * `constants/faq.ts` (single source of truth, never retyped by hand) onto
 * the live Atlas workspace, then publishes it.
 *
 * Category ids are "01".."05" plus "scenarios"; item `category` references
 * its category block's id. `id`/`category` are identifiers, not copy, so
 * they live in the base (ja) data only — never in translations.en.data.
 *
 * Idempotent: safe to run twice. Every write goes through
 * `ensurePublishedPage` (scripts/atlas/lib.ts): it updates first and only
 * creates on a 404, so an existing page is updated in place (blocks fully
 * replaced, never appended), and publishing an already-published page is a
 * no-op.
 *
 * Requires the `page_hero`, `faq_category` and `faq_item` block types to
 * already exist — run `npm run atlas:schema` first.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-faq.ts
 */
import { faqCategories, faqItems, scenariosHeading } from "@/constants/faq";
import { ogImageForSlug } from "./og-image";
import {
  requireAtlasEnv,
  createScriptManagementClient,
  getContentType,
  ensurePublishedPage,
} from "./lib";

const PAGE_SLUG = "faq";

const BLOCK_TYPE_SLUGS = ["page_hero", "faq_category", "faq_item"] as const;

interface BlockDraft {
  block_type_id: string;
  parent_id: null;
  position: number;
  data: Record<string, unknown>;
  translations?: { en: { data: Record<string, unknown> } };
}

function makeBlock(
  typeIds: Record<string, string>,
  slug: string,
  position: number,
  data: Record<string, unknown>,
  en?: Record<string, string>,
): BlockDraft {
  const blockTypeId = typeIds[slug];
  if (!blockTypeId) {
    throw new Error(`Unknown block type "${slug}" — run "npm run atlas:schema" first.`);
  }
  const draft: BlockDraft = { block_type_id: blockTypeId, parent_id: null, position, data };
  if (en && Object.keys(en).length > 0) {
    draft.translations = { en: { data: en } };
  }
  return draft;
}

async function main(): Promise<void> {
  const env = requireAtlasEnv();
  const client = await createScriptManagementClient();

  const typeIds: Record<string, string> = {};
  for (const slug of BLOCK_TYPE_SLUGS) {
    const contentType = await getContentType(env, slug);
    if (!contentType) {
      throw new Error(`Content type "${slug}" not found — run "npm run atlas:schema" first.`);
    }
    typeIds[slug] = contentType.id;
  }

  const blocks: BlockDraft[] = [];
  let position = 0;
  const next = () => position++;

  // page_hero — FAQ section heading + intro. Not a CMS block of its own:
  // reuses the shared page_hero type, mirroring use-case/service-flow.
  blocks.push(
    makeBlock(
      typeIds,
      "page_hero",
      next(),
      {
        heading: "よくあるご質問",
        body: "Care24Japanのサービスについてよくいただくご質問をまとめました。",
      },
      {
        heading: "FAQ",
        body: "Find answers to the most common questions about Care24Japan's services.",
      },
    ),
  );

  // faq_category x6 — the scenarios heading is a shared constant rendered
  // separately from any category label; it is seeded as the "scenarios"
  // category's label (same string, single source).
  for (const cat of faqCategories) {
    const label = cat.id === "scenarios" ? scenariosHeading : cat.label;
    blocks.push(
      makeBlock(
        typeIds,
        "faq_category",
        next(),
        { id: cat.id, label: label.ja },
        { label: label.en },
      ),
    );
  }

  // faq_item x29 — id/category are identifiers (ja data only), question and
  // answer are localizable copy.
  for (const item of faqItems) {
    blocks.push(
      makeBlock(
        typeIds,
        "faq_item",
        next(),
        { id: item.id, category: item.category, question: item.question.ja, answer: item.answer.ja },
        { question: item.question.en, answer: item.answer.en },
      ),
    );
  }

  if (blocks.length !== 1 + faqCategories.length + faqItems.length) {
    throw new Error(
      `faq: expected ${1 + faqCategories.length + faqItems.length} blocks, built ${blocks.length}`,
    );
  }

  const og = ogImageForSlug(PAGE_SLUG);
  const { created, published } = await ensurePublishedPage(client, {
    slug: PAGE_SLUG,
    seo: {
      title: "よくあるご質問",
      description:
        "Care24Japanのサービス内容・ケアサポーター・料金・ご予約など、よくいただくご質問（Q1〜Q24）とご利用シーン（S1〜S5）をまとめました。",
      ...(og ? { og_image: og.ja } : {}),
    },
    seo_translations: {
      en: {
        title: "FAQ",
        description:
          "Answers to common questions about Care24Japan's services, care supporters, pricing, and reservations — 24 questions plus 5 use-case scenarios.",
        ...(og ? { og_image: og.en } : {}),
      },
    },
    blocks,
  });

  console.log(
    created
      ? `+ page "${PAGE_SLUG}" created (${blocks.length} blocks)`
      : `= page "${PAGE_SLUG}" already existed, blocks replaced (${blocks.length} blocks)`,
  );
  console.log(published ? "  published" : "  already published");
}

main().catch((error) => {
  console.error("[atlas:seed-faq] failed:", error);
  process.exitCode = 1;
});
