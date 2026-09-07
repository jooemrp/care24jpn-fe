import "server-only";

import { cache } from "react";
import { apiFailure, apiSuccess, unwrap, type ApiResult } from "@/lib/api";
import { cmsErrorToApiError, CmsContentError } from "./errors";
import {
  getPageBlocksStrict,
} from "./client";
import {
  mapBlocksByType,
  optionalBi,
  optionalLines,
  requiredBi,
  requiredJa,
  requiredNumber,
  requiredUrl,
  type BlockTypeList,
} from "./fields";
import type { Bilingual, CmsBlock } from "./types";
import type {
  CourseRates,
  CourseRateRow,
  SupporterRates,
  SupporterRateRow,
} from "@/constants/pricing";
import type { FeesCopy, PricingCopy, RatesContent } from "@/features/rates/types";

export type { FeesCopy, PricingCopy };

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
// used by the seed data ("care" / "nursing"). Reordering the table in the
// dashboard, or adding a 5th row to one course, remains CMS-authoritative;
// malformed or incomplete rows throw a typed content error.
// ---------------------------------------------------------------------------

const RATES_TYPES = ["rate-course", "rate-row"] as const satisfies BlockTypeList;

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

function mapRateRow(block: CmsBlock, index: number): RateRow {
  const context = `rates/rate-row[${index}]`;
  const key = requiredJa(block.data, "row_key", context);
  return {
    key,
    label: requiredBi(block.data, "label", context),
    detail: optionalBi(block.data, "detail", context),
    customer: requiredNumber(block.data, "customer_price", context),
    supporter: requiredNumber(block.data, "supporter_pay", context),
  };
}

function mapRateCourse(
  courseBlock: CmsBlock,
  rowBlocks: CmsBlock[],
  courseIndex: number,
): RateCourseTable {
  const courseContext = `rates/rate-course[${courseIndex}]`;
  const key = requiredJa(courseBlock.data, "course_key", courseContext);

  const rows = rowBlocks
    .map((block, rowIndex) => ({ block, rowIndex }))
    .filter(({ block }) => requiredJa(block.data, "course_key", `rates/rate-row`) === key)
    .map(({ block, rowIndex }) => mapRateRow(block, rowIndex));

  return {
    key,
    name: requiredBi(courseBlock.data, "name", courseContext),
    rows,
  };
}

export function mapRatesTable(blocks: CmsBlock[]): RateCourseTable[] {
  const groups = mapBlocksByType("rates", blocks, RATES_TYPES);

  const courseBlocks = groups["rate-course"];
  const rowBlocks = groups["rate-row"];

  const table = courseBlocks.map((courseBlock, index) =>
    mapRateCourse(courseBlock, rowBlocks, index),
  );

  const courseKeys = new Set(table.map((course) => course.key));
  const orphan = rowBlocks.findIndex(
    (block) => !courseKeys.has(requiredJa(block.data, "course_key", "rates/rate-row")),
  );
  if (orphan !== -1) {
    throw new CmsContentError(
      "CMS_INVALID_REQUIRED_FIELD",
      `rates/rate-row[${orphan}] references a missing rate-course.`,
      [`rates/rate-row[${orphan}].course_key`],
      "rates",
    );
  }

  return table;
}

async function fetchRatesTable(): Promise<RateCourseTable[]> {
  return mapRatesTable(unwrap(await getPageBlocksStrict("rates")));
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
function projectCourseRates(table: RateCourseTable[]): CourseRates[] {
  return table.map((course) => ({
    key: course.key,
    name: course.name,
    rows: course.rows.map((row) =>
      withOptionalDetail<CourseRateRow>({
        key: row.key,
        label: row.label,
        detail: row.detail,
        price: row.customer,
      }),
    ),
  }));
}

/** `/pricing` projection: `customer_price` -> `CourseRateRow.price`. */
export async function getCourseRates(): Promise<CourseRates[]> {
  return projectCourseRates(await getRatesTable());
}

/** `/fees` projection: `customer_price` -> `SupporterRateRow.customer`,
 * `supporter_pay` -> `SupporterRateRow.supporter`. */
function projectSupporterRates(table: RateCourseTable[]): SupporterRates[] {
  return table.map((course) => ({
    key: course.key,
    name: course.name,
    rows: course.rows.map((row) =>
      withOptionalDetail<SupporterRateRow>({
        key: row.key,
        label: row.label,
        detail: row.detail,
        customer: row.customer,
        supporter: row.supporter,
      }),
    ),
  }));
}

/** `/fees` projection: `customer_price` -> `SupporterRateRow.customer`,
 * `supporter_pay` -> `SupporterRateRow.supporter`. */
export async function getSupporterRates(): Promise<SupporterRates[]> {
  return projectSupporterRates(await getRatesTable());
}

// ---------------------------------------------------------------------------
// Pricing copy — "pricing" page (page_hero + pricing_meta).
// ---------------------------------------------------------------------------

const PRICING_TYPES = ["page-hero", "pricing-meta"] as const satisfies BlockTypeList;

export function mapPricingCopy(blocks: CmsBlock[]): PricingCopy {
  const groups = mapBlocksByType("pricing", blocks, PRICING_TYPES);

  const [heroBlock] = groups["page-hero"];
  const [metaBlock] = groups["pricing-meta"];

  return {
    hero: {
      heading: requiredBi(heroBlock.data, "heading", "pricing/page-hero"),
      body: requiredBi(heroBlock.data, "body", "pricing/page-hero"),
    },
    highlights: optionalLines(metaBlock.data, "highlights", "pricing/pricing-meta"),
    note: requiredBi(metaBlock.data, "note", "pricing/pricing-meta"),
    paymentNote: requiredBi(metaBlock.data, "payment_note", "pricing/pricing-meta"),
    cancellationLinkLabel: requiredBi(
      metaBlock.data,
      "cancellation_label",
      "pricing/pricing-meta",
    ),
    // Optional 0825 hygiene — seeded with the cancellation label destination.
    cancellationHref: requiredUrl(
      metaBlock.data,
      "cancellation_href",
      "pricing/pricing-meta",
    ),
  };
}

async function fetchPricingCopy(): Promise<PricingCopy> {
  return mapPricingCopy(unwrap(await getPageBlocksStrict("pricing")));
}

/** Deduped per-render (React `cache()`). */
export const getPricingCopy = cache(fetchPricingCopy);

// ---------------------------------------------------------------------------
// Fees copy — "fees" page (page_hero + fees_meta).
// ---------------------------------------------------------------------------

const FEES_TYPES = ["page-hero", "fees-meta"] as const satisfies BlockTypeList;

export function mapFeesCopy(blocks: CmsBlock[]): FeesCopy {
  const groups = mapBlocksByType("fees", blocks, FEES_TYPES);

  const [heroBlock] = groups["page-hero"];
  const [metaBlock] = groups["fees-meta"];

  return {
    hero: {
      heading: requiredBi(heroBlock.data, "heading", "fees/page-hero"),
      body: requiredBi(heroBlock.data, "body", "fees/page-hero"),
    },
    columns: {
      service: optionalBi(metaBlock.data, "column_service", "fees/fees-meta"),
      customer: requiredBi(metaBlock.data, "column_customer", "fees/fees-meta"),
      supporter: requiredBi(metaBlock.data, "column_supporter", "fees/fees-meta"),
    },
    note: requiredBi(metaBlock.data, "note", "fees/fees-meta"),
    ctaHref: requiredUrl(metaBlock.data, "cta_href", "fees/fees-meta"),
  };
}

async function fetchFeesCopy(): Promise<FeesCopy> {
  return mapFeesCopy(unwrap(await getPageBlocksStrict("fees")));
}

/** Deduped per-render (React `cache()`). */
export const getFeesCopy = cache(fetchFeesCopy);

// ---------------------------------------------------------------------------
// Shared rates payload — pricing and fees query family.
// ---------------------------------------------------------------------------

/**
 * Strict read used by the shared client query. All three CMS pages are read
 * in one action and both rate projections are derived from the same table,
 * so customer prices, supporter pay, and pricing JSON-LD cannot drift apart.
 */
export async function getRatesStrict(): Promise<ApiResult<RatesContent>> {
  try {
    const [ratesResult, pricingResult, feesResult] = await Promise.all([
      getPageBlocksStrict("rates"),
      getPageBlocksStrict("pricing"),
      getPageBlocksStrict("fees"),
    ]);

    if (!ratesResult.success) return apiFailure(ratesResult.error);
    if (!pricingResult.success) return apiFailure(pricingResult.error);
    if (!feesResult.success) return apiFailure(feesResult.error);

    const table = mapRatesTable(ratesResult.data);
    const pricing = mapPricingCopy(pricingResult.data);
    const fees = mapFeesCopy(feesResult.data);

    return apiSuccess(
      {
        pricing,
        fees,
        courseRates: projectCourseRates(table),
        supporterRates: projectSupporterRates(table),
      },
      ratesResult.traceId ?? pricingResult.traceId ?? feesResult.traceId,
    );
  } catch (error) {
    return apiFailure(
      cmsErrorToApiError(error, "The rates content is unavailable."),
    );
  }
}

/**
 * Strict server-render payload used by metadata and initial hydration.
 */
export async function getRatesForRender(): Promise<RatesContent> {
  return unwrap(await getRatesStrict());
}
