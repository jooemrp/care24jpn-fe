/**
 * Seeds the "faq" page from `constants/faq.ts` (single source of truth) onto
 * the live Atlas workspace, then publishes it.
 *
 * Block order (matching live Atlas + features/cms/faq-map.ts):
 *   page_hero,
 *   faq_category x6,
 *   faq_item x29 (Q1–Q24 then S1–S5),
 *   faq_page
 *
 * `faq_page.heading` / `.intro` deliberately duplicate `page_hero` — the
 * mapper validates both; hero remains the visual source.
 *
 * Non-localizable keys (`id`, `item_key`, `category`, `category_key`) ride in
 * the JA `data` dict only, never in `translations.en`.
 *
 * Idempotent: safe to run twice. Every write goes through
 * `ensurePublishedPage` (scripts/atlas/lib.ts): it updates first and only
 * creates on a 404, so an existing page is updated in place (blocks fully
 * replaced, never appended). Pass the COMPLETE block list — a partial PUT
 * wipes omitted blocks on this backend.
 *
 * Requires FAQ block types to exist — run `npm run atlas:schema` first
 * (`faq_page` / `faq_category` / `faq_item` plus shared `page_hero`).
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-faq.ts
 */
import {
  faqCategories,
  faqHero,
  faqItems,
  faqPage,
} from "@/constants/faq";
import type { Bilingual } from "@/constants/copy";
import { seoRoutes } from "@/constants/seo";
import { ogImageForSlug } from "./og-image";
import {
  requireAtlasEnv,
  createScriptManagementClient,
  getContentType,
  ensurePublishedPage,
} from "./lib";

function splitBilingual(
  fields: Record<string, Bilingual | undefined>,
): { ja: Record<string, string>; en: Record<string, string> } {
  const ja: Record<string, string> = {};
  const en: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    ja[key] = value.ja;
    en[key] = value.en;
  }
  return { ja, en };
}

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
  ja: Record<string, unknown>,
  en: Record<string, string>,
): BlockDraft {
  const blockTypeId = typeIds[slug];
  if (!blockTypeId) {
    throw new Error(`Unknown block type "${slug}" — run "npm run atlas:schema" first.`);
  }
  const draft: BlockDraft = { block_type_id: blockTypeId, parent_id: null, position, data: ja };
  if (Object.keys(en).length > 0) {
    draft.translations = { en: { data: en } };
  }
  return draft;
}

const EXPECTED_BLOCKS = 1 + faqCategories.length + faqItems.length + 1; // 37
const BLOCK_TYPE_SLUGS = ["page_hero", "faq_page", "faq_category", "faq_item"] as const;

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

  if (faqCategories.length !== 6) {
    throw new Error(`Expected 6 faqCategories, got ${faqCategories.length}`);
  }
  if (faqItems.length !== 29) {
    throw new Error(`Expected 29 faqItems, got ${faqItems.length}`);
  }

  const blocks: BlockDraft[] = [];
  let position = 0;
  const next = () => position++;

  {
    const split = splitBilingual({ heading: faqHero.heading, body: faqHero.body });
    blocks.push(makeBlock(typeIds, "page_hero", next(), split.ja, split.en));
  }

  for (const cat of faqCategories) {
    const split = splitBilingual({ label: cat.label });
    blocks.push(
      makeBlock(
        typeIds,
        "faq_category",
        next(),
        { id: cat.id, category_key: cat.id, ...split.ja },
        split.en,
      ),
    );
  }

  for (const item of faqItems) {
    const split = splitBilingual({ question: item.question, answer: item.answer });
    blocks.push(
      makeBlock(
        typeIds,
        "faq_item",
        next(),
        {
          id: item.id,
          item_key: item.id,
          category: item.category,
          category_key: item.category,
          ...split.ja,
        },
        split.en,
      ),
    );
  }

  {
    const split = splitBilingual({
      heading: faqPage.heading,
      intro: faqPage.intro,
      scenarios_heading: faqPage.scenariosHeading,
      view_more_label: faqPage.viewMoreLabel,
      collapse_label: faqPage.collapseLabel,
    });
    blocks.push(makeBlock(typeIds, "faq_page", next(), split.ja, split.en));
  }

  if (blocks.length !== EXPECTED_BLOCKS) {
    throw new Error(`faq: expected ${EXPECTED_BLOCKS} blocks, built ${blocks.length}`);
  }

  const pageSlug = "faq";
  const og = ogImageForSlug(pageSlug);
  const seo = seoRoutes.faq;

  const { created, published } = await ensurePublishedPage(client, {
    slug: pageSlug,
    seo: {
      title: seo.title.ja,
      description: seo.description.ja,
      ...(og ? { og_image: og.ja } : {}),
    },
    seo_translations: {
      en: {
        title: seo.title.en,
        description: seo.description.en,
        ...(og ? { og_image: og.en } : {}),
      },
    },
    blocks,
  });

  console.log(
    created
      ? `+ page "${pageSlug}" created (${blocks.length} blocks)`
      : `= page "${pageSlug}" already existed, blocks replaced (${blocks.length} blocks)`,
  );
  console.log(published ? "  published" : "  already published");

  const q15 = faqItems.find((item) => item.id === "Q15");
  if (
    !q15 ||
    !q15.answer.ja.includes("](/pricing)") ||
    !q15.answer.en.includes("](/pricing)")
  ) {
    throw new Error("Q15 answers must include a markdown link to /pricing (0907 #22).");
  }
}

main().catch((error) => {
  console.error("[atlas:seed-faq] failed:", error);
  process.exitCode = 1;
});
