/**
 * Seeds three Atlas pages, all sourced from `constants/pricing.ts` and
 * `constants/copy.ts` — the same files `features/cms/rates.ts` falls back to
 * when Atlas is unreachable:
 *
 * - "rates" (10 blocks: 2 rate_course + 8 rate_row) — the SOLE source of
 *   every yen figure on the site. `customer_price` is read by `/pricing` as
 *   `CourseRateRow.price` and by `/fees` as `SupporterRateRow.customer`; one
 *   field, two projections, so the two tables can never drift apart (this
 *   replaces `CAREGIVING_BASIC_DAY_CUSTOMER_RATE`, constants/pricing.ts:23 —
 *   deleted once this field became the sole source, see the tombstone
 *   comment at constants/pricing.ts:141). Sourced entirely from `supporterRates`, never
 *   retyped by hand, because `supporterRates[c].rows[r].customer ===
 *   courseRates[c].rows[r].price` for all 8 rows (already verified).
 * - "pricing" (2 blocks: page_hero + pricing_meta) from `copy.ts#pricing`.
 * - "fees" (2 blocks: page_hero + fees_meta) from `copy.ts#actionPlan`.
 *
 * Idempotent: safe to run twice, through `ensurePublishedPage`
 * (scripts/atlas/lib.ts). IMPORTANT gotcha that helper works around — page
 * slugs are NOT unique on this backend at the create endpoint (verified live:
 * two `POST /pages` calls with the same slug create two separate rows, no
 * 409). So nothing here blind-creates: the helper sends the full desired
 * `{ seo, seo_translations, blocks }` to `PUT /pages/:slug` first and only
 * falls back to `create()` when that PUT 404s, which is also how it learns
 * the page's current `status` — see that helper's doc comment for why an
 * empty-body probe is NOT used here. It then calls `publish()` only if the
 * page isn't already published (re-publishing an already-published page
 * 400s: "page cannot be published from status 'published'", verified live).
 *
 * `detail` is OMITTED entirely (the key itself, not `detail: ""`) from both
 * `data` and `translations.en.data` for nomination/transport rows.
 * features/cms/merge.ts#mergeBlockData only iterates keys present in the
 * base `data` object, so an absent key reads back as `undefined` — never a
 * truthy `{ ja: "", en: "" }` that would move those rows into
 * CourseRateCard.tsx's "timed" grid. This is the #1 correctness risk in this
 * seed script — get it wrong and a nomination/transport row silently jumps
 * grids on the rendered page.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-rates.ts
 */
import {
  requireAtlasEnv,
  getContentType,
  createScriptManagementClient,
  ensurePublishedPage,
  type AtlasScriptEnv,
} from "./lib";
import { ogImageForSlug } from "./og-image";
import { supporterRates, cancellationLinkLabel, type SupporterRateRow } from "../../constants/pricing";
import { pricing as pricingCopy, actionPlan as feesCopy, type Bilingual } from "../../constants/copy";

interface BlockInput {
  block_type_id: string;
  parent_id: null;
  position: number;
  data: Record<string, unknown>;
  translations?: { en: { data: Record<string, unknown> } };
}

interface PageInput {
  slug: string;
  seo: { title: string };
  blocks: BlockInput[];
  // `CreatePageInput`/`UpdatePageInput` (@latellu/atlas-sdk/management) both
  // accept extra keys via an index signature — this satisfies that shape
  // without widening the fields this script actually sets above.
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Block builders — one function per block type used here, each returning a
// BlockInput at the given `position`. Field names match the `rate_course` /
// `rate_row` / `page_hero` / `pricing_meta` / `fees_meta` block types
// declared in scripts/atlas/schema.ts exactly.
// ---------------------------------------------------------------------------

function rateCourseBlock(
  blockTypeId: string,
  position: number,
  courseKey: string,
  name: Bilingual,
): BlockInput {
  return {
    block_type_id: blockTypeId,
    parent_id: null,
    position,
    data: { course_key: courseKey, name: name.ja },
    translations: { en: { data: { name: name.en } } },
  };
}

function rateRowBlock(
  blockTypeId: string,
  position: number,
  courseKey: string,
  row: SupporterRateRow,
): BlockInput {
  const data: Record<string, unknown> = {
    course_key: courseKey,
    row_key: row.key,
    label: row.label.ja,
    customer_price: row.customer,
    supporter_pay: row.supporter,
  };
  const trData: Record<string, unknown> = { label: row.label.en };

  // Detail is OMITTED (not set to "") for nomination/transport rows — see
  // the file-level doc comment above.
  if (row.detail) {
    data.detail = row.detail.ja;
    trData.detail = row.detail.en;
  }

  return {
    block_type_id: blockTypeId,
    parent_id: null,
    position,
    data,
    translations: { en: { data: trData } },
  };
}

function pageHeroBlock(
  blockTypeId: string,
  position: number,
  heading: Bilingual,
  body: Bilingual,
): BlockInput {
  return {
    block_type_id: blockTypeId,
    parent_id: null,
    position,
    data: { heading: heading.ja, body: body.ja },
    translations: { en: { data: { heading: heading.en, body: body.en } } },
  };
}

function pricingMetaBlock(
  blockTypeId: string,
  position: number,
  highlights: Bilingual[],
  note: Bilingual,
  cancellationLabel: Bilingual,
  cancellationHref: string,
): BlockInput {
  // textarea field, one line per highlight — features/cms/rates.ts#pickLines
  // splits this back into `highlights: Bilingual[]` by index.
  const highlightsJa = highlights.map((h) => h.ja).join("\n");
  const highlightsEn = highlights.map((h) => h.en).join("\n");

  return {
    block_type_id: blockTypeId,
    parent_id: null,
    position,
    // `cancellation_href` is non-localizable — rides in JA `data` only.
    data: {
      highlights: highlightsJa,
      note: note.ja,
      cancellation_label: cancellationLabel.ja,
      cancellation_href: cancellationHref,
    },
    translations: {
      en: {
        data: {
          highlights: highlightsEn,
          note: note.en,
          cancellation_label: cancellationLabel.en,
        },
      },
    },
  };
}

function feesMetaBlock(
  blockTypeId: string,
  position: number,
  columnService: Bilingual,
  columnCustomer: Bilingual,
  columnSupporter: Bilingual,
  note: Bilingual,
  ctaHref: string,
): BlockInput {
  return {
    block_type_id: blockTypeId,
    parent_id: null,
    position,
    // `cta_href` is non-localizable — it rides in the JA `data` dict only,
    // same contract as `rate_row.course_key` / `use_case_item.slug`.
    data: {
      column_service: columnService.ja,
      column_customer: columnCustomer.ja,
      column_supporter: columnSupporter.ja,
      note: note.ja,
      cta_href: ctaHref,
    },
    translations: {
      en: {
        data: {
          column_service: columnService.en,
          column_customer: columnCustomer.en,
          column_supporter: columnSupporter.en,
          note: note.en,
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

async function resolveBlockTypeId(env: AtlasScriptEnv, slug: string): Promise<string> {
  const contentType = await getContentType(env, slug);
  if (!contentType) {
    throw new Error(
      `Content type "${slug}" not found on the live workspace. Run "npx tsx scripts/atlas/schema.ts" first.`,
    );
  }
  return contentType.id;
}

function buildRatesPage(courseId: string, rowId: string): PageInput {
  const blocks: BlockInput[] = [];
  let position = 0;

  for (const course of supporterRates) {
    blocks.push(rateCourseBlock(courseId, position, course.key, course.name));
    position += 1;
  }

  for (const course of supporterRates) {
    for (const row of course.rows) {
      blocks.push(rateRowBlock(rowId, position, course.key, row));
      position += 1;
    }
  }

  return {
    slug: "rates",
    seo: { title: "料金表（内部データ）" },
    blocks,
  };
}

function buildPricingPage(heroId: string, metaId: string): PageInput {
  return {
    slug: "pricing",
    seo: { title: "ご利用者様向け料金" },
    blocks: [
      pageHeroBlock(heroId, 0, pricingCopy.hero.heading, pricingCopy.hero.body),
      pricingMetaBlock(
        metaId,
        1,
        pricingCopy.highlights,
        pricingCopy.note,
        cancellationLinkLabel,
        "/cancellation-policy",
      ),
    ],
  };
}

function buildFeesPage(heroId: string, metaId: string): PageInput {
  return {
    slug: "fees",
    seo: { title: "ケアサポーターの時給・報酬体系一覧" },
    blocks: [
      pageHeroBlock(heroId, 0, feesCopy.hero.heading, feesCopy.hero.body),
      feesMetaBlock(
        metaId,
        1,
        feesCopy.columns.service,
        feesCopy.columns.customer,
        feesCopy.columns.supporter,
        feesCopy.note,
        feesCopy.ctaHref,
      ),
    ],
  };
}

async function main(): Promise<void> {
  const env = requireAtlasEnv();
  const client = await createScriptManagementClient();

  const [rateCourseId, rateRowId, pageHeroId, pricingMetaId, feesMetaId] = await Promise.all([
    resolveBlockTypeId(env, "rate_course"),
    resolveBlockTypeId(env, "rate_row"),
    resolveBlockTypeId(env, "page_hero"),
    resolveBlockTypeId(env, "pricing_meta"),
    resolveBlockTypeId(env, "fees_meta"),
  ]);

  const pages: PageInput[] = [
    buildRatesPage(rateCourseId, rateRowId),
    buildPricingPage(pageHeroId, pricingMetaId),
    buildFeesPage(pageHeroId, feesMetaId),
  ];

  for (const page of pages) {
    // og:image travels with the page that owns it — see og-image.ts. `rates`
    // backs no public route, so ogImageForSlug returns null for it.
    const og = ogImageForSlug(page.slug);
    const { created, published } = await ensurePublishedPage(client, {
      ...page,
      seo: { ...page.seo, ...(og ? { og_image: og.ja } : {}) },
      // Only `og_image` is named here on purpose: `preserveEditorSeo` merges
      // it onto whatever EN seo the page already carries (its title, and any
      // description an editor set), so naming one key does not blank the
      // rest. `rates` (og === null) gets no EN row at all — it backs no
      // public route.
      ...(og ? { seo_translations: { en: { og_image: og.en } } } : {}),
    });
    const createdLabel = created ? "+ created" : "= updated (already existed)";
    const publishedLabel = published ? "+ published" : "= already published";
    console.log(
      `${page.slug}: ${createdLabel}, ${publishedLabel} (${page.blocks.length} blocks)`,
    );
  }
}

main().catch((error) => {
  console.error("[atlas:seed-rates] failed:", error);
  process.exitCode = 1;
});
