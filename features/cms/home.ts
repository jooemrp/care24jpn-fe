import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import { getSite } from "./site";
import {
  mapBlocksByType,
  pickBi,
  pickBiOptional,
  pickImage,
  pickJa,
  pickJaLines,
  pickLines,
  type BlockTypeList,
} from "./fields";
import type { Bilingual, CmsBlock } from "./types";

/**
 * The home page content, CMS-sourced, self-contained — no longer derived
 * from `constants/copy.ts` (the fallback layer is gone). Every rendered
 * string, number, href and image URL below comes straight from Atlas; an
 * empty CMS field renders empty.
 *
 * The shape matches what `app/[lang]/page.tsx` consumes — if a field is
 * present here, it is rendered there, and it has a CMS block field backing
 * it (see scripts/atlas/schema.ts + seed-home.ts for the field lists).
 */
export type HomeContent = {
  hero: {
    badge: Bilingual;
    resolve: Bilingual;
    assist: Bilingual;
    heading: Bilingual;
    body: Bilingual;
    ctaPrimary: Bilingual;
    ctaSecondary: Bilingual;
    imageAlt: Bilingual;
    image: string;
    ctaPrimaryHref: string;
    ctaSecondaryHref: string;
    areaBadge: { main: Bilingual; sub: Bilingual };
  };
  values: {
    heading: Bilingual;
    items: { title: Bilingual; body: Bilingual }[];
  };
  about: {
    heading: Bilingual;
    catchphrase: Bilingual;
    body: Bilingual;
    illustration: string;
    cards: { title: Bilingual; body: Bilingual; image: string }[];
  };
  problems: {
    heading: Bilingual;
    closing: Bilingual;
    items: { title: Bilingual; body: Bilingual; icon: string; image: string }[];
  };
  pricingSummary: {
    heading: Bilingual;
    care: {
      label: Bilingual;
      amount: Bilingual;
      minNote: Bilingual;
      transportNote: Bilingual;
    };
    nursing: {
      label: Bilingual;
      amount: Bilingual;
      minNote: Bilingual;
      transportNote: Bilingual;
    };
    extensionNote: Bilingual;
    payment: {
      heading: Bilingual;
      body: Bilingual;
      settleNote: Bilingual;
      logos: { mark: string; src: string; alt: Bilingual }[];
    };
    pricingDetails: { label: Bilingual; href: string };
  };
  nursingCourse: {
    leadIn: Bilingual;
    badge: Bilingual;
    price: {
      label: Bilingual;
      hours: Bilingual;
      amount: Bilingual;
      unit: Bilingual;
      taxNote: Bilingual;
      taxIncluded: Bilingual;
    };
    note: Bilingual;
    panel: { heading: Bilingual; items: { icon: string; label: Bilingual }[] };
  };
  careCourse: {
    leadIn: Bilingual;
    badge: Bilingual;
    tagline: Bilingual;
    taglineSub: Bilingual;
    price: {
      label: Bilingual;
      hours: Bilingual;
      amount: Bilingual;
      unit: Bilingual;
      taxNote: Bilingual;
      taxIncluded: Bilingual;
    };
    fees: { label: Bilingual; value: Bilingual; note?: Bilingual }[];
    cards: { title: Bilingual; imageAlt: Bilingual; items: Bilingual[]; image: string }[];
  };
  examples: {
    leadIn: Bilingual;
    heading: Bilingual;
    hoursLabel: Bilingual;
    servicesLabel: Bilingual;
    scheduleLabel: Bilingual;
    cases: {
      label: Bilingual;
      tone: string;
      title: Bilingual;
      request: Bilingual;
      services: Bilingual[];
      hours: Bilingual;
      schedule: { time: string; activity: Bilingual }[];
    }[];
  };
  flow: {
    heading: Bilingual;
    stepLabel: Bilingual;
    steps: { number: string; title: Bilingual; body: Bilingual; image: string }[];
  };
  apply: {
    consult: {
      heading: Bilingual;
      body: Bilingual;
      cta: Bilingual;
      href: string;
      illustration: string;
    };
    user: { eyebrow: Bilingual; label: Bilingual; href: string };
    staff: { eyebrow: Bilingual; label: Bilingual; href: string };
  };
  contact: {
    leadIn: Bilingual;
    heading: Bilingual;
    phone: string;
    hours: Bilingual;
    isms: Bilingual;
    micsLogo: string;
    isoLogo: string;
    micsLogoAlt: Bilingual;
    isoLogoAlt: Bilingual;
    ctaHref: string;
    leadInOrnamentStart: Bilingual;
    leadInOrnamentEnd: Bilingual;
  };
};

const EMPTY: Bilingual = { ja: "", en: "" };

/**
 * The content types scripts/atlas/seed-home.ts writes. Neither the block
 * COUNT nor the ORDER is part of the contract: a 5th service card or a 7th
 * nursing feature added in the dashboard renders as itself — and, because
 * there is no fallback layer anymore, a missing required block type surfaces
 * the page as unavailable instead of reverting to constants.
 */
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

/** Reads one image field and returns "" when absent — no bundled file
 * fallback (see fields.ts#pickImage). */
function img(data: CmsBlock["data"], key: string, context: string): string {
  return pickImage(data, key, context);
}

/** Maps one `payment` logo block field: mark/alt from CMS, src from CMS. */
function paymentLogo(
  data: CmsBlock["data"],
  mark: string,
  imgKey: string,
  altKey: string,
): HomeContent["pricingSummary"]["payment"]["logos"][number] {
  return {
    mark,
    src: img(data, imgKey, `home/pricing-summary/${mark}`),
    alt: pickBi(data, altKey),
  };
}

function mapHome(blocks: CmsBlock[]): MappedHome | null {
  const groups = mapBlocksByType("home", blocks, HOME_TYPES, reportUnexpectedContent);
  if (!groups) return null;

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
    badge: pickBi(heroBlock.data, "badge"),
    resolve: pickBi(heroBlock.data, "resolve"),
    assist: pickBi(heroBlock.data, "assist"),
    heading: pickBi(heroBlock.data, "heading"),
    body: pickBi(heroBlock.data, "body"),
    ctaPrimary: pickBi(heroBlock.data, "cta_primary"),
    ctaSecondary: pickBi(heroBlock.data, "cta_secondary"),
    imageAlt: pickBi(heroBlock.data, "image_alt"),
    image: img(heroBlock.data, "image", "home/hero"),
    ctaPrimaryHref: pickJa(heroBlock.data, "cta_primary_href"),
    ctaSecondaryHref: pickJa(heroBlock.data, "cta_secondary_href"),
    areaBadge: {
      main: pickBi(heroBlock.data, "area_badge_main"),
      sub: pickBi(heroBlock.data, "area_badge_sub"),
    },
  };

  const valueTitles = pickLines(valuesBlock.data, "item_titles");
  const valueBodies = pickLines(valuesBlock.data, "item_bodies");
  const values: HomeContent["values"] = {
    heading: pickBi(valuesBlock.data, "heading"),
    items: valueTitles.map((title, i) => ({
      title,
      body: valueBodies[i] ?? EMPTY,
    })),
  };

  const cardTitles = pickLines(aboutBlock.data, "card_titles");
  const cardBodies = pickLines(aboutBlock.data, "card_bodies");
  const about: HomeContent["about"] = {
    heading: pickBi(aboutBlock.data, "heading"),
    catchphrase: pickBi(aboutBlock.data, "catchphrase"),
    body: pickBi(aboutBlock.data, "body"),
    illustration: img(aboutBlock.data, "illustration", "home/about/illustration"),
    cards: cardTitles.map((title, i) => ({
      title,
      body: cardBodies[i] ?? EMPTY,
      image: img(aboutBlock.data, `card_image_${i + 1}`, `home/about/card[${i}]`),
    })),
  };

  const problemTitles = pickLines(problemsBlock.data, "items");
  const problemBodies = pickLines(problemsBlock.data, "item_bodies");
  const problemIcons = pickJaLines(problemsBlock.data, "item_icons");
  const problems: HomeContent["problems"] = {
    heading: pickBi(problemsBlock.data, "heading"),
    closing: pickBi(problemsBlock.data, "closing"),
    items: problemTitles.map((title, i) => ({
      title,
      body: problemBodies[i] ?? EMPTY,
      icon: problemIcons[i] ?? "",
      image: img(problemsBlock.data, `item_image_${i + 1}`, `home/problems[${i}]`),
    })),
  };

  const pricingSummary: HomeContent["pricingSummary"] = {
    heading: pickBi(pricingSummaryBlock.data, "heading"),
    care: {
      label: pickBi(pricingSummaryBlock.data, "care_label"),
      amount: pickBi(pricingSummaryBlock.data, "care_amount"),
      minNote: pickBi(pricingSummaryBlock.data, "care_min_note"),
      transportNote: pickBi(pricingSummaryBlock.data, "care_transport_note"),
    },
    nursing: {
      label: pickBi(pricingSummaryBlock.data, "nursing_label"),
      amount: pickBi(pricingSummaryBlock.data, "nursing_amount"),
      minNote: pickBi(pricingSummaryBlock.data, "nursing_min_note"),
      transportNote: pickBi(pricingSummaryBlock.data, "nursing_transport_note"),
    },
    extensionNote: pickBi(pricingSummaryBlock.data, "extension_note"),
    payment: {
      heading: pickBi(pricingSummaryBlock.data, "payment_heading"),
      body: pickBi(pricingSummaryBlock.data, "payment_body"),
      settleNote: pickBi(pricingSummaryBlock.data, "payment_settle_note"),
      logos: [
        paymentLogo(pricingSummaryBlock.data, "visa", "payment_visa", "payment_visa_alt"),
        paymentLogo(pricingSummaryBlock.data, "mastercard", "payment_mastercard", "payment_mastercard_alt"),
        paymentLogo(pricingSummaryBlock.data, "jcb", "payment_jcb", "payment_jcb_alt"),
        paymentLogo(pricingSummaryBlock.data, "amex", "payment_amex", "payment_amex_alt"),
      ],
    },
    pricingDetails: {
      label: pickBi(pricingSummaryBlock.data, "pricing_details_label"),
      href: pickJa(pricingSummaryBlock.data, "pricing_details_href"),
    },
  };

  const nursingItems: HomeContent["nursingCourse"]["panel"]["items"] = nursingFeatureBlocks.map(
    (block) => ({
      // `icon` is a non-localizable select key — read via pickJa.
      icon: pickJa(block.data, "icon"),
      label: pickBi(block.data, "label"),
    }),
  );

  const nursingCourse: HomeContent["nursingCourse"] = {
    leadIn: pickBi(nursingCourseBlock.data, "lead_in"),
    badge: pickBi(nursingCourseBlock.data, "badge"),
    price: {
      label: pickBi(nursingCourseBlock.data, "price_label"),
      hours: pickBi(nursingCourseBlock.data, "price_hours"),
      amount: pickBi(nursingCourseBlock.data, "price_amount"),
      unit: pickBi(nursingCourseBlock.data, "price_unit"),
      taxNote: pickBi(nursingCourseBlock.data, "price_tax_note"),
      taxIncluded: pickBi(nursingCourseBlock.data, "price_tax_included"),
    },
    note: pickBi(nursingCourseBlock.data, "note"),
    panel: {
      heading: pickBi(nursingCourseBlock.data, "panel_heading"),
      items: nursingItems,
    },
  };

  const fees: HomeContent["careCourse"]["fees"] = feeBlocks.map((block) => ({
    label: pickBi(block.data, "label"),
    value: pickBi(block.data, "value"),
    note: pickBiOptional(block.data, "note"),
  }));

  const cards: HomeContent["careCourse"]["cards"] = cardBlocks.map((block, i) => ({
    title: pickBi(block.data, "title"),
    imageAlt: pickBi(block.data, "image_alt"),
    items: pickLines(block.data, "items"),
    image: img(block.data, "image", `home/care-course-card[${i}]`),
  }));

  const careCourse: HomeContent["careCourse"] = {
    leadIn: pickBi(careCourseBlock.data, "lead_in"),
    badge: pickBi(careCourseBlock.data, "badge"),
    tagline: pickBi(careCourseBlock.data, "tagline"),
    taglineSub: pickBi(careCourseBlock.data, "tagline_sub"),
    price: {
      label: pickBi(careCourseBlock.data, "price_label"),
      hours: pickBi(careCourseBlock.data, "price_hours"),
      amount: pickBi(careCourseBlock.data, "price_amount"),
      unit: pickBi(careCourseBlock.data, "price_unit"),
      taxNote: pickBi(careCourseBlock.data, "price_tax_note"),
      taxIncluded: pickBi(careCourseBlock.data, "price_tax_included"),
    },
    fees,
    cards,
  };

  const cases: HomeContent["examples"]["cases"] = caseBlocks.map((block) => {
    const times = pickJaLines(block.data, "schedule_times");
    const activities = pickLines(block.data, "schedule_activities");
    const schedule = times.map((time, ri) => ({
      time,
      activity: activities[ri] ?? EMPTY,
    }));

    return {
      label: pickBi(block.data, "label"),
      tone: pickJa(block.data, "tone"),
      title: pickBi(block.data, "title"),
      request: pickBi(block.data, "request"),
      services: pickLines(block.data, "services"),
      hours: pickBi(block.data, "hours"),
      schedule,
    };
  });

  const examples: HomeContent["examples"] = {
    leadIn: pickBi(examplesBlock.data, "lead_in"),
    heading: pickBi(examplesBlock.data, "heading"),
    hoursLabel: pickBi(examplesBlock.data, "hours_label"),
    servicesLabel: pickBi(examplesBlock.data, "services_label"),
    scheduleLabel: pickBi(examplesBlock.data, "schedule_label"),
    cases,
  };

  const steps: HomeContent["flow"]["steps"] = stepBlocks.map((block, i) => ({
    number: pickJa(block.data, "number"),
    title: pickBi(block.data, "title"),
    body: pickBi(block.data, "body"),
    image: img(block.data, "image", `home/flow-step[${i}]`),
  }));

  const flow: HomeContent["flow"] = {
    heading: pickBi(flowBlock.data, "heading"),
    stepLabel: pickBi(flowBlock.data, "step_label"),
    steps,
  };

  const apply: HomeContent["apply"] = {
    consult: {
      heading: pickBi(applyBlock.data, "consult_heading"),
      body: pickBi(applyBlock.data, "consult_body"),
      cta: pickBi(applyBlock.data, "consult_cta"),
      href: pickJa(applyBlock.data, "consult_href"),
      illustration: img(applyBlock.data, "consult_illustration", "home/apply/consult"),
    },
    user: {
      eyebrow: pickBi(applyBlock.data, "user_eyebrow"),
      label: pickBi(applyBlock.data, "user_label"),
      href: pickJa(applyBlock.data, "user_href"),
    },
    staff: {
      eyebrow: pickBi(applyBlock.data, "staff_eyebrow"),
      label: pickBi(applyBlock.data, "staff_label"),
      href: pickJa(applyBlock.data, "staff_href"),
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
      pricingSummary,
      nursingCourse,
      careCourse,
      examples,
      flow,
      apply,
    },
    contactData: contactBlock.data,
  };
}

function mapContact(data: CmsBlock["data"], phone: string): HomeContent["contact"] {
  return {
    leadIn: pickBi(data, "lead_in"),
    heading: pickBi(data, "heading"),
    phone,
    hours: pickBi(data, "hours"),
    isms: pickBi(data, "isms"),
    micsLogo: img(data, "mics_logo", "home/contact"),
    isoLogo: img(data, "iso_logo", "home/contact"),
    micsLogoAlt: pickBi(data, "mics_logo_alt"),
    isoLogoAlt: pickBi(data, "iso_logo_alt"),
    ctaHref: pickJa(data, "contact_cta_href"),
    leadInOrnamentStart: pickBi(data, "lead_in_ornament_start"),
    leadInOrnamentEnd: pickBi(data, "lead_in_ornament_end"),
  };
}

async function fetchHome(): Promise<HomeContent> {
  const blocks = await getPageBlocks("home");
  if (!blocks) {
    throw new Error(
      '[cms] getHome("home"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the home page is unavailable.',
    );
  }

  const mapped = mapHome(blocks);
  if (!mapped) {
    throw new Error(
      '[cms] getHome("home"): page data did not match the expected block shape — no fallback content exists; the home page is unavailable.',
    );
  }

  // contact.phone is deliberately NOT a field on home_contact — it comes from
  // the shared site chrome, exactly like the days when constants/copy.ts
  // declared `phone: contactPhone.display` once and reused it everywhere.
  const { contactPhone } = await getSite();
  const contact = mapContact(mapped.contactData, contactPhone.display);

  return { ...mapped.rest, contact };
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getHome()` on the same request triggers at most one fetch. */
export const getHome = cache(fetchHome);