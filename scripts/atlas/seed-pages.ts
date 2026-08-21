/**
 * Seeds the "use-case" (5 blocks), "service-flow" (5 blocks) and "company"
 * (9 blocks) pages from `constants/copy.ts#useCase` / `#serviceFlow` /
 * `#company` (single source of truth, never retyped by hand) onto the live
 * Atlas workspace, then publishes each.
 *
 * Block order/fields for each page (matching the block types declared in
 * scripts/atlas/schema.ts):
 *   use-case:     page_hero, use_case_item x4
 *   service-flow: page_hero, service_flow_step x4
 *   company:      page_hero (heading only), company_row x8
 *
 * `company_row.value` is deliberately NOT split line-by-line — the value
 * itself contains a real newline (商号/本社/代表者) and `<dd>` renders it with
 * `whitespace-pre-line`, so one block == one row, one field, newline intact.
 * `use_case_item.slug` is non-localizable (used as the `<article id>` anchor).
 *
 * Idempotent: safe to run twice. Every write goes through
 * `ensurePublishedPage` (scripts/atlas/lib.ts): it updates first and only
 * creates on a 404, so an existing page is updated in place (blocks fully
 * replaced, never appended), and publishing an already-published page is a
 * no-op. Update-first is not optional — page slugs are NOT unique at the
 * create endpoint on this backend, so create-then-catch-409 would duplicate
 * all three pages on the second run.
 *
 * Requires the 30 block types to already exist — run `npm run atlas:schema`
 * first.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-pages.ts
 */
import { useCase, serviceFlow, company, type Bilingual } from "@/constants/copy";
import { ogImageForSlug } from "./og-image";
import {
  requireAtlasEnv,
  createScriptManagementClient,
  getContentType,
  ensurePublishedPage,
  requireMediaManifest,
  mediaId,
} from "./lib";

// ---------------------------------------------------------------------------
// Small builders — derive block `data` / `translations.en.data` from the
// bilingual constants without retyping any copy by hand. Same contract as
// scripts/atlas/seed-home.ts.
// ---------------------------------------------------------------------------

/** Joins a list of Bilingual strings into one Bilingual, one item per line —
 * mirrors the `textarea` + `split("\n")` pattern the schema field expects. */
function biJoin(items: Bilingual[]): Bilingual {
  return {
    ja: items.map((i) => i.ja).join("\n"),
    en: items.map((i) => i.en).join("\n"),
  };
}

/**
 * Splits a set of named Bilingual fields into a JA dict (for `data`) and an
 * EN dict (for `translations.en.data`). A field whose value is `undefined`
 * is omitted from BOTH dicts entirely — the key never lands in `data`, so
 * the read-side merge sees no key at all and pages.ts gets `undefined`,
 * never `{ja:"",en:""}`.
 */
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

/** Builds one block draft. `ja` may also carry non-localizable raw fields
 * (`use_case_item.slug`) alongside the split JA strings — those must never
 * appear in `en`. */
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

/** create-or-replace-then-publish one page through the shared idempotent
 * helper, plus this script's own logging. */
async function upsertPage(
  client: Awaited<ReturnType<typeof createScriptManagementClient>>,
  pageSlug: string,
  seo: { title: string },
  seoTranslations: { en: { title: string } },
  blocks: BlockDraft[],
): Promise<void> {
  // og:image travels with the page that owns it — see og-image.ts for why it
  // is not written by a script of its own.
  const og = ogImageForSlug(pageSlug);

  const { created, published } = await ensurePublishedPage(client, {
    slug: pageSlug,
    seo: { ...seo, ...(og ? { og_image: og.ja } : {}) },
    seo_translations: { en: { ...seoTranslations.en, ...(og ? { og_image: og.en } : {}) } },
    blocks,
  });

  console.log(
    created
      ? `+ page "${pageSlug}" created (${blocks.length} blocks)`
      : `= page "${pageSlug}" already existed, blocks replaced (${blocks.length} blocks)`,
  );
  console.log(published ? "  published" : "  already published");
}

// ---------------------------------------------------------------------------
// Block type slugs these pages need (fetched once, mapped to their UUIDs).
// ---------------------------------------------------------------------------

/**
 * Which `public/images/` file each use case ships with, by index — the seeded
 * default for the four cases in `constants/copy.ts` today.
 *
 * This is what replaces `src={`/images/use-case-${i + 1}.webp`}` in
 * app/[lang]/use-case/page.tsx, where the picture was derived from the loop
 * index: a fifth case added from the dashboard pointed at
 * `/images/use-case-5.webp`, a file that does not exist, and 404'd with no
 * warning anywhere. With the picture stored on the block, a new case carries
 * whichever media the editor picks instead. The check below keeps the *seed*
 * honest — a fifth case added to `constants/copy.ts` stops the run rather
 * than seeding a case with no image.
 */
const USE_CASE_IMAGES = [
  "use-case-1.webp",
  "use-case-2.webp",
  "use-case-3.webp",
  "use-case-4.webp",
] as const;

const BLOCK_TYPE_SLUGS = ["page_hero", "use_case_item", "service_flow_step", "company_row"] as const;

async function main(): Promise<void> {
  const env = requireAtlasEnv();
  const client = await createScriptManagementClient();
  const media = requireMediaManifest();

  const typeIds: Record<string, string> = {};
  for (const slug of BLOCK_TYPE_SLUGS) {
    const contentType = await getContentType(env, slug);
    if (!contentType) {
      throw new Error(`Content type "${slug}" not found — run "npm run atlas:schema" first.`);
    }
    typeIds[slug] = contentType.id;
  }

  // -------------------------------------------------------------------------
  // use-case: page_hero, use_case_item x4
  // -------------------------------------------------------------------------
  {
    const blocks: BlockDraft[] = [];
    let position = 0;
    const next = () => position++;

    {
      const split = splitBilingual({ heading: useCase.hero.heading, body: useCase.hero.body });
      const ja = { ...split.ja, cta_href: useCase.hero.ctaHref };
      blocks.push(makeBlock(typeIds, "page_hero", next(), ja, split.en));
    }

    if (useCase.cases.length !== USE_CASE_IMAGES.length) {
      throw new Error(
        `constants/copy.ts#useCase.cases has ${useCase.cases.length} cases but USE_CASE_IMAGES lists ` +
          `${USE_CASE_IMAGES.length} images. Add the new case's image to public/images/, to ` +
          "scripts/atlas/upload-media.ts#ASSETS and to that list.",
      );
    }

    // `image` holds the Atlas MEDIA ID (not a URL, not a path) — the
    // dashboard's image field renderer stores ids, so anything else here
    // would be replaced the first time an editor swaps the picture. It is
    // non-localizable (one file per case, only `image_alt` is translated), so
    // it rides in the JA data dict alongside `slug` and never in `en`.
    useCase.cases.forEach((c, i) => {
      const highlights = biJoin(c.highlights);
      const split = splitBilingual({
        title: c.title,
        body: c.body,
        detail: c.detail,
        highlights,
        image_alt: c.imageAlt,
      });
      const ja = { slug: c.slug, ...split.ja, image: mediaId(media, USE_CASE_IMAGES[i]) };
      blocks.push(makeBlock(typeIds, "use_case_item", next(), ja, split.en));
    });

    if (blocks.length !== 5) {
      throw new Error(`use-case: expected 5 blocks, built ${blocks.length}`);
    }

    await upsertPage(
      client,
      "use-case",
      { title: "ご利用シーン" },
      { en: { title: "Use cases" } },
      blocks,
    );
  }

  // -------------------------------------------------------------------------
  // service-flow: page_hero, service_flow_step x4
  // -------------------------------------------------------------------------
  {
    const blocks: BlockDraft[] = [];
    let position = 0;
    const next = () => position++;

    {
      const split = splitBilingual({ heading: serviceFlow.hero.heading, body: serviceFlow.hero.body });
      const ja = { ...split.ja, cta_href: serviceFlow.hero.ctaHref };
      blocks.push(makeBlock(typeIds, "page_hero", next(), ja, split.en));
    }

    // `number` (ST-FIX4) is non-localizable — replaces StepFlow.tsx's old
    // `{i + 1}` loop-index numeral, same contract as `home_flow_step.number`.
    for (const step of serviceFlow.steps) {
      const split = splitBilingual({ title: step.title, body: step.body });
      const ja = { number: step.number, ...split.ja };
      blocks.push(makeBlock(typeIds, "service_flow_step", next(), ja, split.en));
    }

    if (blocks.length !== 5) {
      throw new Error(`service-flow: expected 5 blocks, built ${blocks.length}`);
    }

    await upsertPage(
      client,
      "service-flow",
      { title: "ご利用の流れ" },
      { en: { title: "How it works" } },
      blocks,
    );
  }

  // -------------------------------------------------------------------------
  // company: page_hero (heading only, body left empty), company_row x8
  // -------------------------------------------------------------------------
  {
    const blocks: BlockDraft[] = [];
    let position = 0;
    const next = () => position++;

    {
      const split = splitBilingual({ heading: company.heading });
      blocks.push(makeBlock(typeIds, "page_hero", next(), split.ja, split.en));
    }

    // `row_key` goes into the base (`ja`) data only, never the `en`
    // translation: it is non-localizable in schema.ts because it is a stable
    // identifier, not copy. `features/seo/organization.ts` reads it to find
    // the trade-name / head-office / established rows without matching on
    // translated label text.
    for (const row of company.rows) {
      const split = splitBilingual({ label: row.label, value: row.value });
      blocks.push(
        makeBlock(typeIds, "company_row", next(), { ...split.ja, row_key: row.key }, split.en),
      );
    }

    if (blocks.length !== 9) {
      throw new Error(`company: expected 9 blocks, built ${blocks.length}`);
    }

    await upsertPage(
      client,
      "company",
      { title: "運営会社" },
      { en: { title: "Operating Company" } },
      blocks,
    );
  }
}

main().catch((error) => {
  console.error("[atlas:seed-pages] failed:", error);
  process.exitCode = 1;
});
