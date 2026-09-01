import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import {
  mapBlocksByType,
  pickBi,
  pickBiOptional,
  pickJa,
  pickLines,
  pickNumber,
  warnOnce,
  type BlockTypeList,
} from "./fields";
import type { Bilingual, CmsBlock } from "./types";
import type { CourseRates, SupporterRates } from "@/constants/pricing";

// ---------------------------------------------------------------------------
// Rates table — "rates" page (rate_course xN + rate_row xN), the
// SOLE source of every yen figure on the site. `CAREGIVING_BASIC_DAY_CUSTOMER_
// RATE` (constants/pricing.ts:23) used to guarantee courseRates[0].rows[0]
// .price === supporterRates[0].rows[0].customer by being the same TS
// constant read twice; now it's guaranteed structurally, because there is
// only ONE `customer_price` field per row and BOTH projections below read it.
//
// Nothing here depends on block POSITION any more. Courses and rows are told
// apart by block type, and each row is attached to its course by the
// `course_key` field both block types carry — the same key
// `constants/pricing.ts` uses ("care" / "nursing"). Reordering the table in
// the dashboard, or adding a 5th row to one course, no longer silently
// reverts every yen figure on the site to constants/pricing.ts — actually,
// there IS no fallback anymore: if the CMS table is unavailable or malformed,
// the rates pages surface an error rather than stale constants figures.
// ---------------------------------------------------------------------------

const RATES_TYPES = ["rate-course", "rate-row"] as const satisfies BlockTypeList;

const EMPTY: Bilingual = { ja: "", en: "" };

type RateRow = {
  key: string;
  label: Bilingual;
  detail?: Bilingual;
  customer: number;
  supporter: number;
};

type RateCourseTable = {
  key: string;
  name: Bilingual;
  rows: RateRow[];
};

function mapRateRow(block: CmsBlock, courseKey: string): RateRow {
  const key = pickJa(block.data, "row_key");
  const context = `rates/${courseKey}/${key || "unknown-row"}`;
  return {
    key,
    label: pickBi(block.data, "label"),
    detail: pickBiOptional(block.data, "detail"),
    customer: pickNumber(block.data, "customer_price", context),
    supporter: pickNumber(block.data, "supporter_pay", context),
  };
}

function mapRateCourse(courseBlock: CmsBlock, rowBlocks: CmsBlock[]): RateCourseTable {
  // The course key comes first: it is what pairs this block with its rows, so
  // it must be resolved before any row is read.
  const key = pickJa(courseBlock.data, "course_key");

  const rows = rowBlocks
    .filter((block) => pickJa(block.data, "course_key") === key)
    .map((block) => mapRateRow(block, key));

  return {
    key,
    name: pickBi(courseBlock.data, "name"),
    rows,
  };
}

function mapRatesTable(blocks: CmsBlock[]): RateCourseTable[] | null {
  const groups = mapBlocksByType("rates", blocks, RATES_TYPES, reportUnexpectedContent);
  if (!groups) return null;

  const courseBlocks = groups["rate-course"];
  const rowBlocks = groups["rate-row"];

  const table = courseBlocks.map((courseBlock) => mapRateCourse(courseBlock, rowBlocks));

  // A row whose `course_key` matches no course block would silently vanish
  // from both /pricing and /fees — that is a missing price, so say so.
  const mappedRowCount = table.reduce((sum, course) => sum + course.rows.length, 0);
  if (mappedRowCount !== rowBlocks.length) {
    warnOnce(
      "rates:orphan-rows",
      `[cms:unexpected-content] page "rates": ${rowBlocks.length - mappedRowCount} of ${rowBlocks.length} rate-row block(s) have a course_key matching no rate-course block and are NOT rendered on /pricing or /fees. Fix the row's Course field in the dashboard. This warning only prints once per process.`,
    );
  }

  return table;
}

async function fetchRatesTable(): Promise<RateCourseTable[]> {
  const blocks = await getPageBlocks("rates");
  if (!blocks) {
    throw new Error(
      '[cms] getCourseRates/getSupporterRates("rates"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the rates pages are unavailable.',
    );
  }
  const table = mapRatesTable(blocks);
  if (!table) {
    throw new Error(
      '[cms] getCourseRates/getSupporterRates("rates"): page data did not match the expected block shape — no fallback content exists; the rates pages are unavailable.',
    );
  }
  return table;
}

/** Deduped per-render (React `cache()`): every server component reading
 * either projection below on the same request triggers at most one fetch. */
const getRatesTable = cache(fetchRatesTable);

/** `detail` must be OMITTED from the row object (not present with value
 * `undefined`) so a CMS-sourced row is deep-equal to its
 * `constants/pricing.ts` counterpart, which never declares the property for
 * nomination/transport rows — and so `row.detail` stays falsy for
 * `CourseRateCard.tsx`'s timed/extras split either way. */
function withOptionalDetail<T extends { detail?: Bilingual }>(row: T): T {
  if (row.detail !== undefined) return row;
  const rest = { ...row };
  delete rest.detail;
  return rest;
}

/** `/pricing` projection: `customer_price` -> `CourseRateRow.price`. */
export async function getCourseRates(): Promise<CourseRates[]> {
  const table = await getRatesTable();
  return table.map((course) => ({
    key: course.key,
    name: course.name,
    rows: course.rows.map((row) =>
      withOptionalDetail<CourseRates["rows"][number]>({
        key: row.key,
        label: row.label,
        detail: row.detail,
        price: row.customer,
      }),
    ),
  }));
}

/** `/fees` projection: `customer_price` -> `SupporterRateRow.customer`,
 * `supporter_pay` -> `SupporterRateRow.supporter`. */
export async function getSupporterRates(): Promise<SupporterRates[]> {
  const table = await getRatesTable();
  return table.map((course) => ({
    key: course.key,
    name: course.name,
    rows: course.rows.map((row) =>
      withOptionalDetail<SupporterRates["rows"][number]>({
        key: row.key,
        label: row.label,
        detail: row.detail,
        customer: row.customer,
        supporter: row.supporter,
      }),
    ),
  }));
}

// ---------------------------------------------------------------------------
// Pricing copy — "pricing" page (page_hero + pricing_meta).
// ---------------------------------------------------------------------------

const PRICING_TYPES = ["page-hero", "pricing-meta"] as const satisfies BlockTypeList;

/**
 * The CMS-sourced "pricing" page copy. Self-contained shape (the old
 * `PricingCopy` was derived from `constants/copy.ts#pricing` — the shape is
 * kept identical so consumers don't change), with the cancellation link now
 * included as CMS fields instead of `constants/pricing.ts#cancellationLinkLabel`.
 */
export type PricingCopy = {
  hero: {
    heading: Bilingual;
    body: Bilingual;
  };
  highlights: Bilingual[];
  note: Bilingual;
  cancellation: {
    label: Bilingual;
    href: string;
  };
};

function mapPricingCopy(blocks: CmsBlock[]): PricingCopy | null {
  const groups = mapBlocksByType("pricing", blocks, PRICING_TYPES, reportUnexpectedContent);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const [metaBlock] = groups["pricing-meta"];

  return {
    hero: {
      heading: pickBi(heroBlock.data, "heading"),
      body: pickBi(heroBlock.data, "body"),
    },
    highlights: pickLines(metaBlock.data, "highlights"),
    note: pickBi(metaBlock.data, "note"),
    cancellation: {
      label: pickBi(metaBlock.data, "cancellation_label"),
      href: pickJa(metaBlock.data, "cancellation_href"),
    },
  };
}

async function fetchPricingCopy(): Promise<PricingCopy> {
  const blocks = await getPageBlocks("pricing");
  if (!blocks) {
    throw new Error(
      '[cms] getPricingCopy("pricing"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the pricing page is unavailable.',
    );
  }
  const copy = mapPricingCopy(blocks);
  if (!copy) {
    throw new Error(
      '[cms] getPricingCopy("pricing"): page data did not match the expected block shape — no fallback content exists; the pricing page is unavailable.',
    );
  }
  return copy;
}

/** Deduped per-render (React `cache()`). */
export const getPricingCopy = cache(fetchPricingCopy);

// ---------------------------------------------------------------------------
// Fees copy — "fees" page (page_hero + fees_meta).
// ---------------------------------------------------------------------------

const FEES_TYPES = ["page-hero", "fees-meta"] as const satisfies BlockTypeList;

/** CMS-sourced "fees" page copy — shape identical to the old
 * `typeof constants/copy.ts#actionPlan`. */
export type FeesCopy = {
  hero: {
    heading: Bilingual;
    body: Bilingual;
  };
  columns: {
    service: Bilingual;
    customer: Bilingual;
    supporter: Bilingual;
  };
  note: Bilingual;
  ctaHref: string;
};

function mapFeesCopy(blocks: CmsBlock[]): FeesCopy | null {
  const groups = mapBlocksByType("fees", blocks, FEES_TYPES, reportUnexpectedContent);
  if (!groups) return null;

  const [heroBlock] = groups["page-hero"];
  const [metaBlock] = groups["fees-meta"];

  return {
    hero: {
      heading: pickBi(heroBlock.data, "heading"),
      body: pickBi(heroBlock.data, "body"),
    },
    columns: {
      service: pickBi(metaBlock.data, "column_service"),
      customer: pickBi(metaBlock.data, "column_customer"),
      supporter: pickBi(metaBlock.data, "column_supporter"),
    },
    note: pickBi(metaBlock.data, "note"),
    ctaHref: pickJa(metaBlock.data, "cta_href"),
  };
}

async function fetchFeesCopy(): Promise<FeesCopy> {
  const blocks = await getPageBlocks("fees");
  if (!blocks) {
    throw new Error(
      '[cms] getFeesCopy("fees"): page data unavailable (Atlas unreachable, not configured, or page missing) — no fallback content exists; the fees page is unavailable.',
    );
  }
  const copy = mapFeesCopy(blocks);
  if (!copy) {
    throw new Error(
      '[cms] getFeesCopy("fees"): page data did not match the expected block shape — no fallback content exists; the fees page is unavailable.',
    );
  }
  return copy;
}

/** Deduped per-render (React `cache()`). */
export const getFeesCopy = cache(fetchFeesCopy);