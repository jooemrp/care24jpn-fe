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
import { home as fallbackHome } from "@/constants/copy";

type Home = typeof fallbackHome;
type Fee = Home["careCourse"]["fees"][number];
type Card = Home["careCourse"]["cards"][number];

/**
 * `constants/copy.ts` carries no image paths — every `<Image src>` on this
 * page used to be a literal in JSX, and the care-course cards derived theirs
 * from the LOOP INDEX (`/images/use-case-${i + 1}.webp`), which meant a 5th
 * card added in the dashboard rendered a guaranteed 404. So the home content
 * this loader returns is the constants shape PLUS one image URL per rendered
 * image, and the card's image is now a property OF THE CARD.
 */
export type HomeContent = Omit<Home, "hero" | "careCourse" | "contact" | "flow"> & {
  hero: Home["hero"] & { image: string };
  careCourse: Omit<Home["careCourse"], "cards"> & {
    cards: (Card & { image: string })[];
  };
  contact: Home["contact"] & { micsLogo: string; isoLogo: string };
  // `steps[].icon` is dropped — see the `FlowStep` comment above.
  flow: Omit<Home["flow"], "steps"> & { steps: FlowStep[] };
};

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
type FlowStep = Omit<Home["flow"]["steps"][number], "icon">;

/**
 * The files bundled in `public/images/` — the safety net for when Atlas is
 * down, or answered without expanding a media id into a URL. They are NOT
 * deleted from the repo; `pickImage` falls back to them per field.
 */
const FALLBACK_IMAGES = {
  hero: "/images/hero.webp",
  micsLogo: "/images/mics-logo.png",
  isoLogo: "/images/iso27001-bsi.png",
  /**
   * One per card in `constants/copy.ts#home.careCourse.cards`, in that order
   * — the exact files the old index-derived `src` produced, so the CMS-OFF
   * render is unchanged. A card BEYOND this list has no bundled counterpart
   * and falls back to `""`, which `page.tsx` renders as a card with no image
   * rather than as a broken one. That case can only arise from a dashboard
   * card whose `image` field was also left empty.
   */
  cards: [
    "/images/use-case-1.webp",
    "/images/use-case-2.webp",
    "/images/use-case-3.webp",
    "/images/use-case-4.webp",
  ],
} as const;

// ---------------------------------------------------------------------------
// Assembly — the content types scripts/atlas/seed-home.ts writes. 10 section
// types + 4 repeated item types; the seed currently produces 29 blocks, but
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
  "home-problems",
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

function mapHome(blocks: CmsBlock[]): MappedHome | null {
  const groups = mapBlocksByType("home", blocks, HOME_TYPES, reportUnexpectedContent);
  if (!groups) return null;

  const [heroBlock] = groups["home-hero"];
  const [valuesBlock] = groups["home-values"];
  const [problemsBlock] = groups["home-problems"];
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

  const F = fallbackHome;

  // Every `F.<...>[i]` below is indexed defensively: a repeated block type may
  // now hold more items than `constants/copy.ts` declares, in which case there
  // is no constants entry at that index to fall back to.
  const EMPTY: Bilingual = { ja: "", en: "" };

  const hero: HomeContent["hero"] = {
    badge: pickBi(heroBlock.data, "badge", F.hero.badge),
    resolve: pickBi(heroBlock.data, "resolve", F.hero.resolve),
    assist: pickBi(heroBlock.data, "assist", F.hero.assist),
    heading: pickBi(heroBlock.data, "heading", F.hero.heading),
    body: pickBi(heroBlock.data, "body", F.hero.body),
    ctaPrimary: pickBi(heroBlock.data, "cta_primary", F.hero.ctaPrimary),
    ctaSecondary: pickBi(heroBlock.data, "cta_secondary", F.hero.ctaSecondary),
    imageAlt: pickBi(heroBlock.data, "image_alt", F.hero.imageAlt),
    image: pickImage(heroBlock.data, "image", FALLBACK_IMAGES.hero, "home/hero"),
    ctaPrimaryHref: pickJa(heroBlock.data, "cta_primary_href", F.hero.ctaPrimaryHref),
    ctaSecondaryHref: pickJa(heroBlock.data, "cta_secondary_href", F.hero.ctaSecondaryHref),
    areaBadge: {
      main: pickBi(heroBlock.data, "area_badge_main", F.hero.areaBadge.main),
      sub: pickBi(heroBlock.data, "area_badge_sub", F.hero.areaBadge.sub),
    },
  };

  const valueTitles = pickLines(valuesBlock.data, "item_titles", F.values.items.map((i) => i.title));
  const valueBodies = pickLines(valuesBlock.data, "item_bodies", F.values.items.map((i) => i.body));
  const values: Home["values"] = {
    heading: pickBi(valuesBlock.data, "heading", F.values.heading),
    items: valueTitles.map((title, i) => ({
      title,
      body: valueBodies[i] ?? F.values.items[i]?.body ?? title,
    })),
  };

  const problems: Home["problems"] = {
    heading: pickBi(problemsBlock.data, "heading", F.problems.heading),
    items: pickLines(problemsBlock.data, "items", F.problems.items),
  };

  const nursingItems: NursingFeature[] = nursingFeatureBlocks.map((block, i) => ({
    icon: pickJa(block.data, "icon", F.nursingCourse.panel.items[i]?.icon ?? ""),
    label: pickBi(block.data, "label", F.nursingCourse.panel.items[i]?.label ?? EMPTY),
  }));

  const nursingCourse: Home["nursingCourse"] = {
    leadIn: pickBi(nursingCourseBlock.data, "lead_in", F.nursingCourse.leadIn),
    badge: pickBi(nursingCourseBlock.data, "badge", F.nursingCourse.badge),
    price: {
      label: pickBi(nursingCourseBlock.data, "price_label", F.nursingCourse.price.label),
      hours: pickBi(nursingCourseBlock.data, "price_hours", F.nursingCourse.price.hours),
      amount: pickBi(nursingCourseBlock.data, "price_amount", F.nursingCourse.price.amount),
      unit: pickBi(nursingCourseBlock.data, "price_unit", F.nursingCourse.price.unit),
      taxNote: pickBi(nursingCourseBlock.data, "price_tax_note", F.nursingCourse.price.taxNote),
      taxIncluded: pickBi(nursingCourseBlock.data, "price_tax_included", F.nursingCourse.price.taxIncluded),
    },
    note: pickBi(nursingCourseBlock.data, "note", F.nursingCourse.note),
    panel: {
      heading: pickBi(nursingCourseBlock.data, "panel_heading", F.nursingCourse.panel.heading),
      items: nursingItems,
    },
  };

  const fees: Fee[] = feeBlocks.map((block, i) => ({
    label: pickBi(block.data, "label", F.careCourse.fees[i]?.label ?? EMPTY),
    value: pickBi(block.data, "value", F.careCourse.fees[i]?.value ?? EMPTY),
    note: pickBiOptional(block.data, "note"),
  }));

  const cards: HomeContent["careCourse"]["cards"] = cardBlocks.map((block, i) => ({
    title: pickBi(block.data, "title", F.careCourse.cards[i]?.title ?? EMPTY),
    imageAlt: pickBi(block.data, "image_alt", F.careCourse.cards[i]?.imageAlt ?? EMPTY),
    items: pickLines(block.data, "items", F.careCourse.cards[i]?.items ?? []),
    // The card's own image — no longer `/images/use-case-${i + 1}.webp`. The
    // index survives only in the FALLBACK, where it addresses the four files
    // that ship with the repo.
    image: pickImage(block.data, "image", FALLBACK_IMAGES.cards[i] ?? "", `home/care-course-card[${i}]`),
  }));

  const careCourse: HomeContent["careCourse"] = {
    leadIn: pickBi(careCourseBlock.data, "lead_in", F.careCourse.leadIn),
    badge: pickBi(careCourseBlock.data, "badge", F.careCourse.badge),
    tagline: pickBi(careCourseBlock.data, "tagline", F.careCourse.tagline),
    taglineSub: pickBi(careCourseBlock.data, "tagline_sub", F.careCourse.taglineSub),
    price: {
      label: pickBi(careCourseBlock.data, "price_label", F.careCourse.price.label),
      hours: pickBi(careCourseBlock.data, "price_hours", F.careCourse.price.hours),
      amount: pickBi(careCourseBlock.data, "price_amount", F.careCourse.price.amount),
      unit: pickBi(careCourseBlock.data, "price_unit", F.careCourse.price.unit),
      taxNote: pickBi(careCourseBlock.data, "price_tax_note", F.careCourse.price.taxNote),
      taxIncluded: pickBi(careCourseBlock.data, "price_tax_included", F.careCourse.price.taxIncluded),
    },
    fees,
    cards,
  };

  const cases: ExampleCase[] = caseBlocks.map((block, i) => {
    const fallbackCase: (typeof F.examples.cases)[number] | undefined = F.examples.cases[i];
    const fallbackSchedule = fallbackCase?.schedule ?? [];
    const times = pickJaLines(
      block.data,
      "schedule_times",
      fallbackSchedule.map((row) => row.time),
    );
    const activities = pickLines(
      block.data,
      "schedule_activities",
      fallbackSchedule.map((row) => row.activity),
    );
    const schedule: ScheduleRow[] = times.map((time, ri) => ({
      time,
      activity: activities[ri] ?? fallbackSchedule[ri]?.activity ?? EMPTY,
    }));

    return {
      label: pickBi(block.data, "label", fallbackCase?.label ?? EMPTY),
      tone: pickJa(block.data, "tone", fallbackCase?.tone ?? ""),
      title: pickBi(block.data, "title", fallbackCase?.title ?? EMPTY),
      request: pickBi(block.data, "request", fallbackCase?.request ?? EMPTY),
      services: pickLines(block.data, "services", fallbackCase?.services ?? []),
      hours: pickBi(block.data, "hours", fallbackCase?.hours ?? EMPTY),
      schedule,
    };
  });

  const examples: Home["examples"] = {
    leadIn: pickBi(examplesBlock.data, "lead_in", F.examples.leadIn),
    heading: pickBi(examplesBlock.data, "heading", F.examples.heading),
    hoursLabel: pickBi(examplesBlock.data, "hours_label", F.examples.hoursLabel),
    servicesLabel: pickBi(examplesBlock.data, "services_label", F.examples.servicesLabel),
    scheduleLabel: pickBi(examplesBlock.data, "schedule_label", F.examples.scheduleLabel),
    cases,
  };

  const steps: FlowStep[] = stepBlocks.map((block, i) => ({
    number: pickJa(block.data, "number", F.flow.steps[i]?.number ?? ""),
    title: pickBi(block.data, "title", F.flow.steps[i]?.title ?? EMPTY),
    body: pickBi(block.data, "body", F.flow.steps[i]?.body ?? EMPTY),
  }));

  const flow: HomeContent["flow"] = {
    heading: pickBi(flowBlock.data, "heading", F.flow.heading),
    stepLabel: pickBi(flowBlock.data, "step_label", F.flow.stepLabel),
    steps,
  };

  const apply: Home["apply"] = {
    user: {
      eyebrow: pickBi(applyBlock.data, "user_eyebrow", F.apply.user.eyebrow),
      label: pickBi(applyBlock.data, "user_label", F.apply.user.label),
      href: pickJa(applyBlock.data, "user_href", F.apply.user.href),
    },
    staff: {
      eyebrow: pickBi(applyBlock.data, "staff_eyebrow", F.apply.staff.eyebrow),
      label: pickBi(applyBlock.data, "staff_label", F.apply.staff.label),
      href: pickJa(applyBlock.data, "staff_href", F.apply.staff.href),
    },
  };

  // `home-contact` is mapped by the caller (see fetchHome()) for its
  // non-phone fields — contact.phone comes from getSite(), never from this
  // block, because the phone number is a site-wide value (also used in the
  // navbar/footer), not something an editor would set per-page on `home`.
  return {
    rest: { hero, values, problems, nursingCourse, careCourse, examples, flow, apply },
    contactData: contactBlock.data,
  };
}

function mapContact(data: CmsBlock["data"], phone: string): HomeContent["contact"] {
  const F = fallbackHome;
  return {
    leadIn: pickBi(data, "lead_in", F.contact.leadIn),
    heading: pickBi(data, "heading", F.contact.heading),
    phone,
    hours: pickBi(data, "hours", F.contact.hours),
    isms: pickBi(data, "isms", F.contact.isms),
    micsLogo: pickImage(data, "mics_logo", FALLBACK_IMAGES.micsLogo, "home/contact"),
    isoLogo: pickImage(data, "iso_logo", FALLBACK_IMAGES.isoLogo, "home/contact"),
    micsLogoAlt: pickBi(data, "mics_logo_alt", F.contact.micsLogoAlt),
    isoLogoAlt: pickBi(data, "iso_logo_alt", F.contact.isoLogoAlt),
    ctaHref: pickJa(data, "contact_cta_href", F.contact.ctaHref),
    leadInOrnamentStart: pickBi(data, "lead_in_ornament_start", F.contact.leadInOrnamentStart),
    leadInOrnamentEnd: pickBi(data, "lead_in_ornament_end", F.contact.leadInOrnamentEnd),
  };
}

/** `constants/copy.ts#home` plus the bundled image paths — what every fallback
 * path in this file returns, so a CMS-less render is byte-identical to the
 * pre-CMS page. */
const FALLBACK_HOME: HomeContent = {
  ...fallbackHome,
  hero: { ...fallbackHome.hero, image: FALLBACK_IMAGES.hero },
  careCourse: {
    ...fallbackHome.careCourse,
    cards: fallbackHome.careCourse.cards.map((card, i) => ({
      ...card,
      image: FALLBACK_IMAGES.cards[i] ?? "",
    })),
  },
  contact: {
    ...fallbackHome.contact,
    micsLogo: FALLBACK_IMAGES.micsLogo,
    isoLogo: FALLBACK_IMAGES.isoLogo,
  },
};

async function fetchHome(): Promise<HomeContent> {
  const blocks = await getPageBlocks("home");
  if (!blocks) return FALLBACK_HOME;

  const mapped = mapHome(blocks);
  if (!mapped) return FALLBACK_HOME;

  // contact.phone is deliberately NOT a field on home_contact — it comes from
  // the shared site chrome, exactly like constants/copy.ts:560
  // (`phone: contactPhone.display`).
  const { contactPhone } = await getSite();
  const contact = mapContact(mapped.contactData, contactPhone.display);

  return { ...mapped.rest, contact };
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getHome()` on the same request triggers at most one fetch. */
export const getHome = cache(fetchHome);
