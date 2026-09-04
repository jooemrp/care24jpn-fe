import "server-only";

import { cache } from "react";
import { apiFailure, apiSuccess, unwrap, type ApiResult } from "@/lib/api";
import { CmsContentError, cmsErrorToApiError } from "./errors";
import {
  getPageBlocksStrict,
} from "./client";
import { getSite } from "./site";
import {
  mapBlocksByType,
  optionalBi,
  optionalLines,
  requiredBi,
  requiredEnum,
  requiredImageUrl,
  requiredJa,
  requiredUrl,
  type BlockTypeList,
} from "./fields";
import type { CmsBlock } from "./types";
import type { home as HomeCopy } from "@/constants/copy";
import type { HomeContent } from "@/features/home/types";

type Home = typeof HomeCopy;
type Fee = Home["careCourse"]["fees"][number];

/**
 * `constants/copy.ts` carries no image paths — every `<Image src>` on this
 * page used to be a literal in JSX, and the care-course cards derived theirs
 * from the LOOP INDEX (`/images/use-case-${i + 1}.webp`), which meant a 5th
 * card added in the dashboard rendered a guaranteed 404. So the home content
 * this loader returns is the constants shape PLUS one image URL per rendered
 * image, and the card's image is now a property OF THE CARD.
 */
export type { HomeContent } from "@/features/home/types";

type NursingFeature = Home["nursingCourse"]["panel"]["items"][number];
type ExampleCase = Home["examples"]["cases"][number];
type ScheduleRow = ExampleCase["schedule"][number];
/**
 * `icon` is dropped, permanently: it is a `select` field of icon KEYS (see
 * scripts/atlas/schema.ts, `home_flow_step.icon`), but the flow rail in
 * app/[lang]/page.tsx renders each step as a numbered node on a dashed
 * line — the number IS the visual, there is no icon slot to fill. This is
 * a retired-but-undeletable field (same status as `tab_switch_label`, see
 * seed-site.ts): scripts/atlas/seed-home.ts now writes it as an explicit
 * "" rather than a real value, so the dashboard control is inert by
 * design, not merely unread. The key stays untouched in
 * `constants/copy.ts` so this file never contends with ST-K1 for that
 * entry; it is just never read here.
 */
/**
 * `icon` (select of icon keys) is retired in favor of `image` (Atlas media
 * URL). The select field stays on the content type because Atlas has no
 * delete-field endpoint; seed writes it as "".
 */
type FlowStep = Omit<Home["flow"]["steps"][number], "icon"> & { image: string };

function requireEqualLengths(
  context: string,
  firstKey: string,
  first: readonly unknown[],
  secondKey: string,
  second: readonly unknown[],
): void {
  if (first.length === second.length) return;
  throw new CmsContentError(
    "CMS_INVALID_REQUIRED_FIELD",
    `${context}: "${firstKey}" and "${secondKey}" must contain the same number of items.`,
    [`${context}.${firstKey}`, `${context}.${secondKey}`],
    context,
  );
}

// ---------------------------------------------------------------------------
// Assembly — the content types scripts/atlas/seed-home.ts writes. 10 section
// types + 4 repeated item types; the seed currently produces 30 blocks, but
// neither the COUNT nor the ORDER is part of the contract any more: a 5th
// service card or a 7th nursing feature added in the dashboard renders as
// itself instead of reverting the entire home page to constants/copy.ts.
//
// Each entry is a content-type slug, checked against the generated
// `atlas.types.ts` at compile time (see `fields.ts#BlockTypeList`).
// ---------------------------------------------------------------------------

const HOME_TYPES = [
  "home-hero",
  "home-values",
  "home-about",
  "home-problems",
  "home-pricing-summary",
  "home-nursing-course",
  "home-nursing-feature",
  "home-care-course",
  "home-care-course-fee",
  "home-care-course-card",
  "home-examples",
  "home-example-case",
  "home-flow",
  "home-flow-step",
  "home-apply",
  "home-contact",
] as const satisfies BlockTypeList;

/** `mapHome` needs the `home-contact` block too, but its result is assembled
 * by the caller (contact.phone comes from `getSite()`, not from this page) —
 * so the grouped blocks are handed back alongside the mapped content instead
 * of re-deriving them with a second index lookup. */
interface MappedHome {
  rest: Omit<HomeContent, "contact">;
  contactData: CmsBlock["data"];
}

function mapHome(blocks: CmsBlock[]): MappedHome {
  const groups = mapBlocksByType("home", blocks, HOME_TYPES);

  const [heroBlock] = groups["home-hero"];
  const [valuesBlock] = groups["home-values"];
  const [aboutBlock] = groups["home-about"];
  const [problemsBlock] = groups["home-problems"];
  const [pricingSummaryBlock] = groups["home-pricing-summary"];
  const [nursingCourseBlock] = groups["home-nursing-course"];
  const [careCourseBlock] = groups["home-care-course"];
  const [examplesBlock] = groups["home-examples"];
  const [flowBlock] = groups["home-flow"];
  const [applyBlock] = groups["home-apply"];
  const [contactBlock] = groups["home-contact"];

  const nursingFeatureBlocks = groups["home-nursing-feature"];
  const feeBlocks = groups["home-care-course-fee"];
  const cardBlocks = groups["home-care-course-card"];
  const caseBlocks = groups["home-example-case"];
  const stepBlocks = groups["home-flow-step"];

  const hero: HomeContent["hero"] = {
    badge: requiredBi(heroBlock.data, "badge", "home/home-hero"),
    resolve: requiredBi(heroBlock.data, "resolve", "home/home-hero"),
    assist: requiredBi(heroBlock.data, "assist", "home/home-hero"),
    heading: requiredBi(heroBlock.data, "heading", "home/home-hero"),
    body: optionalBi(heroBlock.data, "body", "home/home-hero"),
    ctaPrimary: requiredBi(heroBlock.data, "cta_primary", "home/home-hero"),
    ctaSecondary: optionalBi(heroBlock.data, "cta_secondary", "home/home-hero"),
    imageAlt: requiredBi(heroBlock.data, "image_alt", "home/home-hero"),
    image: requiredImageUrl(heroBlock.data, "image", "home/home-hero"),
    ctaPrimaryHref: requiredUrl(heroBlock.data, "cta_primary_href", "home/home-hero"),
    ctaSecondaryHref: requiredUrl(heroBlock.data, "cta_secondary_href", "home/home-hero"),
    areaBadge: {
      main: requiredBi(heroBlock.data, "area_badge_main", "home/home-hero"),
      sub: requiredBi(heroBlock.data, "area_badge_sub", "home/home-hero"),
    },
  };

  const valueTitles = optionalLines(valuesBlock.data, "item_titles", "home/home-values");
  const valueBodies = optionalLines(valuesBlock.data, "item_bodies", "home/home-values");
  requireEqualLengths(
    "home/home-values",
    "item_titles",
    valueTitles,
    "item_bodies",
    valueBodies,
  );
  const values: Home["values"] = {
    heading: requiredBi(valuesBlock.data, "heading", "home/home-values"),
    items: valueTitles.map((title, i) => ({
      title,
      body: valueBodies[i]!,
    })),
  };

  const cardTitles = optionalLines(aboutBlock.data, "card_titles", "home/home-about");
  const cardBodies = optionalLines(aboutBlock.data, "card_bodies", "home/home-about");
  requireEqualLengths(
    "home/home-about",
    "card_titles",
    cardTitles,
    "card_bodies",
    cardBodies,
  );
  const aboutCardImages = [
    requiredImageUrl(aboutBlock.data, "card_image_1", "home/home-about"),
    requiredImageUrl(aboutBlock.data, "card_image_2", "home/home-about"),
    requiredImageUrl(aboutBlock.data, "card_image_3", "home/home-about"),
  ];
  requireEqualLengths(
    "home/home-about",
    "card_titles",
    cardTitles,
    "card_images",
    aboutCardImages,
  );
  const about: HomeContent["about"] = {
    heading: requiredBi(aboutBlock.data, "heading", "home/home-about"),
    catchphrase: requiredBi(aboutBlock.data, "catchphrase", "home/home-about"),
    body: requiredBi(aboutBlock.data, "body", "home/home-about"),
    illustration: requiredImageUrl(aboutBlock.data, "illustration", "home/home-about"),
    cards: cardTitles.map((title, i) => ({
      title,
        body: cardBodies[i]!,
      image: aboutCardImages[i]!,
    })),
  };

  const problemTitles = optionalLines(problemsBlock.data, "items", "home/home-problems");
  const problemImages = [
    requiredImageUrl(problemsBlock.data, "item_image_1", "home/home-problems"),
    requiredImageUrl(problemsBlock.data, "item_image_2", "home/home-problems"),
    requiredImageUrl(problemsBlock.data, "item_image_3", "home/home-problems"),
    requiredImageUrl(problemsBlock.data, "item_image_4", "home/home-problems"),
    requiredImageUrl(problemsBlock.data, "item_image_5", "home/home-problems"),
  ];
  requireEqualLengths(
    "home/home-problems",
    "items",
    problemTitles,
    "item_images",
    problemImages,
  );
  const problems: HomeContent["problems"] = {
    heading: requiredBi(problemsBlock.data, "heading", "home/home-problems"),
    closing: requiredBi(problemsBlock.data, "closing", "home/home-problems"),
    items: problemTitles.map((title, i) => ({
      title,
      body: title,
      image: problemImages[i]!,
    })),
  };

  const pricingSummary: HomeContent["pricingSummary"] = {
    heading: requiredBi(
      pricingSummaryBlock.data,
      "heading",
      "home/home-pricing-summary",
    ),
    payment: {
      heading: requiredBi(
        pricingSummaryBlock.data,
        "payment_heading",
        "home/home-pricing-summary",
      ),
      body: requiredBi(
        pricingSummaryBlock.data,
        "payment_body",
        "home/home-pricing-summary",
      ),
      settleNote: requiredBi(
        pricingSummaryBlock.data,
        "payment_settle_note",
        "home/home-pricing-summary",
      ),
      logos: [
        {
          mark: "visa",
          src: requiredImageUrl(
            pricingSummaryBlock.data,
            "payment_visa",
            "home/home-pricing-summary",
          ),
        },
        {
          mark: "mastercard",
          src: requiredImageUrl(
            pricingSummaryBlock.data,
            "payment_mastercard",
            "home/home-pricing-summary",
          ),
        },
        {
          mark: "jcb",
          src: requiredImageUrl(
            pricingSummaryBlock.data,
            "payment_jcb",
            "home/home-pricing-summary",
          ),
        },
        {
          mark: "amex",
          src: requiredImageUrl(
            pricingSummaryBlock.data,
            "payment_amex",
            "home/home-pricing-summary",
          ),
        },
      ],
    },
  };

  const nursingItems: NursingFeature[] = nursingFeatureBlocks.map((block, i) => ({
    icon: requiredEnum(
      block.data,
      "icon",
      ["vitals", "procedure", "medication", "consult", "palliative", "hospital"],
      `home/home-nursing-feature[${i}]`,
    ),
    label: requiredBi(block.data, "label", `home/home-nursing-feature[${i}]`),
  }));

  const nursingCourse: Home["nursingCourse"] = {
    leadIn: requiredBi(nursingCourseBlock.data, "lead_in", "home/home-nursing-course"),
    badge: requiredBi(nursingCourseBlock.data, "badge", "home/home-nursing-course"),
    tagline: requiredBi(nursingCourseBlock.data, "tagline", "home/home-nursing-course"),
    taglineSub: requiredBi(nursingCourseBlock.data, "tagline_sub", "home/home-nursing-course"),
    price: {
      label: requiredBi(nursingCourseBlock.data, "price_label", "home/home-nursing-course"),
      hours: requiredBi(nursingCourseBlock.data, "price_hours", "home/home-nursing-course"),
      amount: requiredBi(nursingCourseBlock.data, "price_amount", "home/home-nursing-course"),
      unit: requiredBi(nursingCourseBlock.data, "price_unit", "home/home-nursing-course"),
      taxNote: requiredBi(nursingCourseBlock.data, "price_tax_note", "home/home-nursing-course"),
      taxIncluded: requiredBi(
        nursingCourseBlock.data,
        "price_tax_included",
        "home/home-nursing-course",
      ),
    },
    note: requiredBi(nursingCourseBlock.data, "note", "home/home-nursing-course"),
    panel: {
      heading: requiredBi(
        nursingCourseBlock.data,
        "panel_heading",
        "home/home-nursing-course",
      ),
      items: nursingItems,
    },
  };

  const fees: Fee[] = feeBlocks.map((block, i) => ({
    label: requiredBi(block.data, "label", `home/home-care-course-fee[${i}]`),
    value: requiredBi(block.data, "value", `home/home-care-course-fee[${i}]`),
    note: optionalBi(block.data, "note", `home/home-care-course-fee[${i}]`),
  }));

  const cards: HomeContent["careCourse"]["cards"] = cardBlocks.map((block, i) => ({
    title: requiredBi(block.data, "title", `home/home-care-course-card[${i}]`),
    imageAlt: requiredBi(block.data, "image_alt", `home/home-care-course-card[${i}]`),
    items: optionalLines(block.data, "items", `home/home-care-course-card[${i}]`),
    image: requiredImageUrl(block.data, "image", `home/home-care-course-card[${i}]`),
  }));

  const careCourse: HomeContent["careCourse"] = {
    leadIn: requiredBi(careCourseBlock.data, "lead_in", "home/home-care-course"),
    badge: requiredBi(careCourseBlock.data, "badge", "home/home-care-course"),
    tagline: requiredBi(careCourseBlock.data, "tagline", "home/home-care-course"),
    taglineSub: requiredBi(careCourseBlock.data, "tagline_sub", "home/home-care-course"),
    price: {
      label: requiredBi(careCourseBlock.data, "price_label", "home/home-care-course"),
      hours: requiredBi(careCourseBlock.data, "price_hours", "home/home-care-course"),
      amount: requiredBi(careCourseBlock.data, "price_amount", "home/home-care-course"),
      unit: requiredBi(careCourseBlock.data, "price_unit", "home/home-care-course"),
      taxNote: requiredBi(careCourseBlock.data, "price_tax_note", "home/home-care-course"),
      taxIncluded: requiredBi(
        careCourseBlock.data,
        "price_tax_included",
        "home/home-care-course",
      ),
    },
    fees,
    cards,
  };

  const cases: ExampleCase[] = caseBlocks.map((block, i) => {
    const context = `home/home-example-case[${i}]`;
    const times = optionalLines(block.data, "schedule_times", context).map((line) => line.ja);
    const activities = optionalLines(block.data, "schedule_activities", context);
    if (times.length !== activities.length) {
      throw new Error(`${context}: schedule_times and schedule_activities must have equal lengths.`);
    }
    const schedule: ScheduleRow[] = times.map((time, ri) => ({
      time,
      activity: activities[ri]!,
    }));

    return {
      label: requiredBi(block.data, "label", context),
      tone: requiredEnum(block.data, "tone", ["primary", "accent"], context),
      title: requiredBi(block.data, "title", context),
      request: requiredBi(block.data, "request", context),
      services: optionalLines(block.data, "services", context),
      hours: requiredBi(block.data, "hours", context),
      schedule,
    };
  });

  const examples: Home["examples"] = {
    leadIn: requiredBi(examplesBlock.data, "lead_in", "home/home-examples"),
    heading: requiredBi(examplesBlock.data, "heading", "home/home-examples"),
    hoursLabel: requiredBi(examplesBlock.data, "hours_label", "home/home-examples"),
    servicesLabel: requiredBi(examplesBlock.data, "services_label", "home/home-examples"),
    scheduleLabel: requiredBi(examplesBlock.data, "schedule_label", "home/home-examples"),
    cases,
  };

  const steps: FlowStep[] = stepBlocks.map((block, i) => ({
    number: requiredJa(block.data, "number", `home/home-flow-step[${i}]`),
    title: requiredBi(block.data, "title", `home/home-flow-step[${i}]`),
    body: requiredBi(block.data, "body", `home/home-flow-step[${i}]`),
    image: requiredImageUrl(block.data, "image", `home/home-flow-step[${i}]`),
  }));

  const flow: HomeContent["flow"] = {
    heading: requiredBi(flowBlock.data, "heading", "home/home-flow"),
    stepLabel: requiredBi(flowBlock.data, "step_label", "home/home-flow"),
    steps,
  };

  const apply: HomeContent["apply"] = {
    user: {
      eyebrow: requiredBi(applyBlock.data, "user_eyebrow", "home/home-apply"),
      label: requiredBi(applyBlock.data, "user_label", "home/home-apply"),
      href: requiredUrl(applyBlock.data, "user_href", "home/home-apply"),
    },
    staff: {
      eyebrow: requiredBi(applyBlock.data, "staff_eyebrow", "home/home-apply"),
      label: requiredBi(applyBlock.data, "staff_label", "home/home-apply"),
      href: requiredUrl(applyBlock.data, "staff_href", "home/home-apply"),
    },
  };

  // `home-contact` is mapped by the caller (see fetchHome()) for its
  // non-phone fields — contact.phone comes from getSite(), never from this
  // block, because the phone number is a site-wide value (also used in the
  // navbar/footer), not something an editor would set per-page on `home`.
  return {
    rest: {
      hero,
      values,
      about,
      problems,
      nursingCourse,
      careCourse,
      examples,
      flow,
      apply,
      pricingSummary,
    },
    contactData: contactBlock.data,
  };
}

function mapContact(data: CmsBlock["data"], phone: string): HomeContent["contact"] {
  return {
    leadIn: requiredBi(data, "lead_in", "home/home-contact"),
    heading: requiredBi(data, "heading", "home/home-contact"),
    phone,
    hours: requiredBi(data, "hours", "home/home-contact"),
    isms: requiredBi(data, "isms", "home/home-contact"),
    micsLogo: requiredImageUrl(data, "mics_logo", "home/home-contact"),
    isoLogo: requiredImageUrl(data, "iso_logo", "home/home-contact"),
    micsLogoAlt: requiredBi(data, "mics_logo_alt", "home/home-contact"),
    isoLogoAlt: requiredBi(data, "iso_logo_alt", "home/home-contact"),
    ctaHref: requiredUrl(data, "contact_cta_href", "home/home-contact"),
    leadInOrnamentStart: requiredBi(
      data,
      "lead_in_ornament_start",
      "home/home-contact",
    ),
    leadInOrnamentEnd: requiredBi(data, "lead_in_ornament_end", "home/home-contact"),
  };
}

async function fetchHome(): Promise<HomeContent> {
  const mapped = mapHome(unwrap(await getPageBlocksStrict("home")));
  const { contactPhone } = await getSite();
  return { ...mapped.rest, contact: mapContact(mapped.contactData, contactPhone.display) };
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getHome()` on the same request triggers at most one fetch. */
export const getHome = cache(fetchHome);

/**
 * Strict home read for client navigation. Unlike `getHome()`, this path does
 * not replace an Atlas failure or an incomplete page with constants.
 */
export async function getHomeStrict(): Promise<ApiResult<HomeContent>> {
  try {
    const result = await getPageBlocksStrict("home");
    if (!result.success) return result;

    const mapped = mapHome(result.data);
    const { contactPhone } = await getSite();
    return apiSuccess(
      {
        ...mapped.rest,
        contact: mapContact(mapped.contactData, contactPhone.display),
      },
      result.traceId,
    );
  } catch (error) {
    return apiFailure(cmsErrorToApiError(error, "The home content is unavailable."));
  }
}
