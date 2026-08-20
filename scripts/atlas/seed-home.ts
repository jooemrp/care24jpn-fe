/**
 * Seeds the "home" page — the 29 blocks that make up `app/[lang]/page.tsx` —
 * from `constants/copy.ts#home` (single source of truth, never retyped by
 * hand) onto the live Atlas workspace, then publishes it.
 *
 * Order and field names follow architecture-plan.json#pages[slug=home]
 * exactly: home_hero, home_values, home_problems, home_nursing_course,
 * home_nursing_feature x6, home_care_course, home_care_course_fee x3,
 * home_care_course_card x4, home_examples, home_example_case x3, home_flow,
 * home_flow_step x4, home_apply, home_contact.
 *
 * Idempotent: safe to run twice. `ensurePublishedPage` (scripts/atlas/lib.ts)
 * updates first and only creates on a 404, so an existing page is updated in
 * place — its blocks fully replaced with this same set, never appended, and
 * never a second page under the same slug (page slugs are NOT unique at the
 * create endpoint on this backend; see that helper's doc comment).
 *
 * Requires the 30 block types to already exist — run `npm run atlas:schema`
 * first.
 *
 * Usage (from marketing-web/):
 *   npx tsx scripts/atlas/seed-home.ts
 */
import { home, type Bilingual } from "@/constants/copy";
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
// bilingual constants without retyping any copy by hand.
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
 * (e.g. `careCourse.fees[0].note`) is omitted from BOTH dicts entirely — the
 * key never lands in `data`, so the read-side merge sees no key at all and
 * `home.ts` gets `undefined`, never `{ja:"",en:""}`.
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
 * (icon, tone, number, staff_href, schedule_times) alongside the split JA
 * strings — those must never appear in `en`. */
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

// ---------------------------------------------------------------------------
// Block type slugs this page needs (fetched once, mapped to their UUIDs).
// ---------------------------------------------------------------------------

/**
 * Which `public/images/` file each Care Course service card ships with, by
 * card index — the seeded default for the four cards that exist in
 * `constants/copy.ts` today.
 *
 * This list is what replaces `src={`/images/use-case-${i + 1}.webp`}` in
 * app/[lang]/page.tsx. The template literal made the picture a function of
 * the loop index, so a fifth card added from the dashboard resolved to
 * `/images/use-case-5.webp`, which does not exist — a guaranteed 404 with
 * nothing in the dashboard warning the editor. After this migration the
 * picture is a field on the block, so a new card simply carries whichever
 * media the editor picks. The list below only supplies the initial value for
 * the four cards this repo already knows about; the length check under it
 * exists so a fifth card added to `constants/copy.ts` (not the dashboard)
 * stops the seed loudly instead of silently seeding a card with no image.
 */
const CARE_COURSE_CARD_IMAGES = [
  "use-case-1.webp",
  "use-case-2.webp",
  "use-case-3.webp",
  "use-case-4.webp",
] as const;

const BLOCK_TYPE_SLUGS = [
  "home_hero",
  "home_values",
  "home_problems",
  "home_nursing_course",
  "home_nursing_feature",
  "home_care_course",
  "home_care_course_fee",
  "home_care_course_card",
  "home_examples",
  "home_example_case",
  "home_flow",
  "home_flow_step",
  "home_apply",
  "home_contact",
] as const;

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

  let position = 0;
  const next = () => position++;
  const blocks: BlockDraft[] = [];

  // 0: home_hero
  {
    const split = splitBilingual({
      badge: home.hero.badge,
      resolve: home.hero.resolve,
      assist: home.hero.assist,
      heading: home.hero.heading,
      body: home.hero.body,
      cta_primary: home.hero.ctaPrimary,
      cta_secondary: home.hero.ctaSecondary,
      image_alt: home.hero.imageAlt,
    });
    // `image` carries the Atlas MEDIA ID (not a URL, not a path): the
    // dashboard's image field renderer stores ids, so seeding anything else
    // would be overwritten with an id the first time an editor swaps the
    // picture. Non-localizable — one file for both locales, only the alt text
    // is translated — so it goes into the JA `data` dict and never into `en`.
    const ja = { ...split.ja, image: mediaId(media, "hero.webp") };
    blocks.push(makeBlock(typeIds, "home_hero", next(), ja, split.en));
  }

  // 1: home_values (3 items)
  {
    const itemTitles = biJoin(home.values.items.map((i) => i.title));
    const itemBodies = biJoin(home.values.items.map((i) => i.body));
    const split = splitBilingual({
      heading: home.values.heading,
      item_titles: itemTitles,
      item_bodies: itemBodies,
    });
    blocks.push(makeBlock(typeIds, "home_values", next(), split.ja, split.en));
  }

  // 2: home_problems (9 items)
  {
    const items = biJoin(home.problems.items);
    const split = splitBilingual({ heading: home.problems.heading, items });
    blocks.push(makeBlock(typeIds, "home_problems", next(), split.ja, split.en));
  }

  // 3: home_nursing_course
  {
    const split = splitBilingual({
      lead_in: home.nursingCourse.leadIn,
      badge: home.nursingCourse.badge,
      price_label: home.nursingCourse.price.label,
      price_hours: home.nursingCourse.price.hours,
      price_amount: home.nursingCourse.price.amount,
      price_unit: home.nursingCourse.price.unit,
      price_tax_note: home.nursingCourse.price.taxNote,
      price_tax_included: home.nursingCourse.price.taxIncluded,
      note: home.nursingCourse.note,
      panel_heading: home.nursingCourse.panel.heading,
    });
    blocks.push(makeBlock(typeIds, "home_nursing_course", next(), split.ja, split.en));
  }

  // 4-9: home_nursing_feature (6 items) — icon is non-localizable (select)
  for (const item of home.nursingCourse.panel.items) {
    const split = splitBilingual({ label: item.label });
    const ja = { icon: item.icon, ...split.ja };
    blocks.push(makeBlock(typeIds, "home_nursing_feature", next(), ja, split.en));
  }

  // 10: home_care_course
  {
    const split = splitBilingual({
      lead_in: home.careCourse.leadIn,
      badge: home.careCourse.badge,
      tagline: home.careCourse.tagline,
      tagline_sub: home.careCourse.taglineSub,
      price_label: home.careCourse.price.label,
      price_hours: home.careCourse.price.hours,
      price_amount: home.careCourse.price.amount,
      price_unit: home.careCourse.price.unit,
      price_tax_note: home.careCourse.price.taxNote,
      price_tax_included: home.careCourse.price.taxIncluded,
    });
    blocks.push(makeBlock(typeIds, "home_care_course", next(), split.ja, split.en));
  }

  // 11-13: home_care_course_fee (3 items) — note is UNDEFINED for [0] and [2],
  // present only for [1]. splitBilingual drops undefined fields entirely, so
  // the read-side merge never sees an empty {ja:"",en:""} for `note`.
  for (const fee of home.careCourse.fees) {
    const split = splitBilingual({ label: fee.label, value: fee.value, note: fee.note });
    blocks.push(makeBlock(typeIds, "home_care_course_fee", next(), split.ja, split.en));
  }

  // 14-17: home_care_course_card (4 cards, 8/7/7/6 items) — `image` is the
  // media id, non-localizable, so it rides in the JA data dict only.
  if (home.careCourse.cards.length !== CARE_COURSE_CARD_IMAGES.length) {
    throw new Error(
      `constants/copy.ts#home.careCourse.cards has ${home.careCourse.cards.length} cards but ` +
        `CARE_COURSE_CARD_IMAGES lists ${CARE_COURSE_CARD_IMAGES.length} images. Add the new card's ` +
        "image to public/images/, to scripts/atlas/upload-media.ts#ASSETS and to that list.",
    );
  }
  home.careCourse.cards.forEach((card, i) => {
    const items = biJoin(card.items);
    const split = splitBilingual({ title: card.title, image_alt: card.imageAlt, items });
    const ja = { ...split.ja, image: mediaId(media, CARE_COURSE_CARD_IMAGES[i]) };
    blocks.push(makeBlock(typeIds, "home_care_course_card", next(), ja, split.en));
  });

  // 18: home_examples
  {
    const split = splitBilingual({
      lead_in: home.examples.leadIn,
      heading: home.examples.heading,
      hours_label: home.examples.hoursLabel,
      services_label: home.examples.servicesLabel,
      schedule_label: home.examples.scheduleLabel,
    });
    blocks.push(makeBlock(typeIds, "home_examples", next(), split.ja, split.en));
  }

  // 19-21: home_example_case (3 cases, 6/4/3 schedule rows)
  // tone and schedule_times are non-localizable — schedule_times keeps the
  // U+301C wide tilde format ("H:MM〜H:MM") that parseTimeRange() splits on.
  for (const c of home.examples.cases) {
    const services = biJoin(c.services);
    const scheduleActivities = biJoin(c.schedule.map((row) => row.activity));
    const scheduleTimes = c.schedule.map((row) => row.time).join("\n");
    const split = splitBilingual({
      label: c.label,
      title: c.title,
      request: c.request,
      services,
      hours: c.hours,
      schedule_activities: scheduleActivities,
    });
    const ja = { tone: c.tone, schedule_times: scheduleTimes, ...split.ja };
    blocks.push(makeBlock(typeIds, "home_example_case", next(), ja, split.en));
  }

  // 22: home_flow
  {
    const split = splitBilingual({ heading: home.flow.heading });
    blocks.push(makeBlock(typeIds, "home_flow", next(), split.ja, split.en));
  }

  // 23-26: home_flow_step (4 steps) — number and icon are non-localizable
  for (const step of home.flow.steps) {
    const split = splitBilingual({ title: step.title, body: step.body });
    const ja = { number: step.number, icon: step.icon, ...split.ja };
    blocks.push(makeBlock(typeIds, "home_flow_step", next(), ja, split.en));
  }

  // 27: home_apply — staff_href is non-localizable
  {
    const split = splitBilingual({
      user_eyebrow: home.apply.user.eyebrow,
      user_label: home.apply.user.label,
      staff_eyebrow: home.apply.staff.eyebrow,
      staff_label: home.apply.staff.label,
    });
    const ja = { ...split.ja, staff_href: home.apply.staff.href };
    blocks.push(makeBlock(typeIds, "home_apply", next(), ja, split.en));
  }

  // 28: home_contact — `phone` is intentionally NOT a field on this block;
  // features/cms/home.ts injects it from constants/copy.ts#contactPhone.
  {
    const split = splitBilingual({
      lead_in: home.contact.leadIn,
      heading: home.contact.heading,
      hours: home.contact.hours,
      isms: home.contact.isms,
    });
    // The two certification marks rendered next to the ISMS note. Their alt
    // text is still hardcoded in app/[lang]/page.tsx — it has never lived in
    // constants/copy.ts, and inventing CMS copy for it is outside this
    // change; only the picture moves to Atlas here.
    const ja = {
      ...split.ja,
      mics_logo: mediaId(media, "mics-logo.png"),
      iso_logo: mediaId(media, "iso27001-bsi.png"),
    };
    blocks.push(makeBlock(typeIds, "home_contact", next(), ja, split.en));
  }

  if (blocks.length !== 29) {
    throw new Error(`Expected 29 blocks, built ${blocks.length} — check the block list above.`);
  }

  const pageSlug = "home";
  const seo = { title: "Care 24 Japan — ご自宅で、心安らぐ24時間の在宅ケアを" };
  const seoTranslations = { en: { title: "Care 24 Japan — Premium 24-hour in-home care" } };

  const { created, published } = await ensurePublishedPage(client, {
    slug: pageSlug,
    seo,
    seo_translations: seoTranslations,
    blocks,
  });

  console.log(
    created
      ? `+ page "${pageSlug}" created (${blocks.length} blocks)`
      : `= page "${pageSlug}" already existed, blocks replaced (${blocks.length} blocks)`,
  );
  console.log(published ? "  published" : "  already published");
}

main().catch((error) => {
  console.error("[atlas:seed-home] failed:", error);
  process.exitCode = 1;
});
