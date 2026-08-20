/**
 * Tests for features/seo/pricingJsonLd.ts — the pure `/pricing` OfferCatalog
 * JSON-LD builder split out of app/[lang]/pricing/page.tsx (ST-G2).
 *
 * Run (from marketing-web/):
 *   npx tsx features/seo/pricingJsonLd.test.ts
 *
 * WHY THIS FILE IS THE ONLY SAFETY NET HERE. `normalizeHtml`
 * (scripts/atlas/verify-html-parity.ts:106) strips every `<script>` tag,
 * contents included, before diffing rendered HTML — and this object is
 * serialized straight into a `<script type="application/ld+json">`
 * (components/JsonLd.tsx). So `npm run atlas:verify` printing a pass proves
 * NOTHING about this file's output, changed or not: the gate cannot see it.
 * These assertions are the entire coverage this area has.
 *
 * This module is loaded via `npx tsx` (not bare `node --test`) because it
 * imports `@/` aliases at runtime (`features/lang/i18n#t`) — bare
 * `node --test` cannot resolve `@/`. Same bootstrapping constraints as
 * organization.test.ts / jsonLdEscape.test.ts for the relative specifier
 * itself: a literal `.ts` extension is required by Node's loader, which
 * tsc's `bundler` moduleResolution rejects in a STATIC import (TS5097), so
 * the specifier is built at runtime and imported dynamically inside
 * `main()`.
 *
 * PROVEN RED — each assertion below was checked against a temporarily
 * broken features/seo/pricingJsonLd.ts (one change at a time, then
 * restored via `diff` against the pre-break file to confirm an exact
 * revert). Exact output observed:
 *
 *   1) `t(...)` calls replaced with `.ja` hardcodes everywhere (the
 *      pre-ST-G2 shape) — the first assertion in test 1 fails immediately:
 *        AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *        + actual - expected
 *        + 'JA見出し'
 *        - 'EN Heading'
 *
 *   2) the `detail` ternary changed to always append the parens
 *      (`row.detail ? t(row.detail, lang) : ""`, unconditionally wrapped in
 *      `（…）`) — the no-detail row gains empty parens:
 *        AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *        + actual - expected
 *        + 'EN Care EN Night Row Label（）'
 *        - 'EN Care EN Night Row Label'
 *
 *   3) `courses.flatMap(...)` reverted to `courses.map(...)` — the result
 *      nests each course's rows as a sub-array instead of flattening, so a
 *      direct index into the (now 2-element, course-major) array reads
 *      `undefined` where a flat item was expected, and the item count is
 *      wrong:
 *        AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *        + actual - expected
 *        + undefined
 *        - 'EN Care EN Care Row Label（EN Detail）'
 *      and, on item count:
 *        AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *        2 !== 3
 *
 * All three breaks were reverted immediately after capturing the output
 * above (`diff` confirmed byte-identical to the pre-break file); the
 * version in the repo is the fixed, ST-G2 shape.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type * as PricingJsonLdModule from "./pricingJsonLd.ts";
import type { CourseRates } from "@/constants/pricing";

const pricingJsonLdPath = "./pricingJsonLd" + ".ts";

function bi(ja: string, en: string): { ja: string; en: string } {
  return { ja, en };
}

/**
 * Two courses x two rows each, JA and EN deliberately non-identical
 * strings — reusing constants/pricing.ts values here would make a
 * wrong-locale read accidentally pass (the JA and EN copy for a real course
 * name can overlap in punctuation/digits). One row per course carries a
 * `detail`; the CMS shape `withOptionalDetail` (features/cms/rates.ts)
 * actually produces OMITS the `detail` KEY entirely on rows without one —
 * not `detail: undefined` — so the row literal below without `detail` must
 * not declare the property at all.
 */
const HEADING = bi("JA見出し", "EN Heading");

const CARE_ROW_WITH_DETAIL: CourseRates["rows"][number] = {
  key: "day",
  label: bi("JA介護行", "EN Care Row Label"),
  detail: bi("JA詳細", "EN Detail"),
  price: 3740,
};

const CARE_ROW_NO_DETAIL: CourseRates["rows"][number] = {
  key: "night",
  label: bi("JA夜間行", "EN Night Row Label"),
  price: 5000,
};

const COURSES: CourseRates[] = [
  {
    key: "care",
    name: bi("JA介護", "EN Care"),
    rows: [CARE_ROW_WITH_DETAIL, CARE_ROW_NO_DETAIL],
  },
  {
    key: "nursing",
    name: bi("JA看護", "EN Nursing"),
    rows: [
      { key: "basic", label: bi("JA看護行", "EN Nursing Row Label"), price: 8000 },
    ],
  },
];

async function main() {
  const { buildPricingJsonLd } = (await import(
    pricingJsonLdPath
  )) as typeof PricingJsonLdModule;

  // ---------------------------------------------------------------------
  // tc-1: lang picks the matching side of every Bilingual value, for the
  // catalog `name` AND every Offer `name` — same fixture, two langs, two
  // provably different outputs.
  // ---------------------------------------------------------------------

  test("lang='en' resolves the EN side of heading/course/label/detail; lang='ja' resolves the JA side", () => {
    const en = buildPricingJsonLd({ heading: HEADING, courses: COURSES, lang: "en" });
    const ja = buildPricingJsonLd({ heading: HEADING, courses: COURSES, lang: "ja" });

    assert.equal(en.name, "EN Heading");
    assert.equal(ja.name, "JA見出し");
    assert.notEqual(en.name, ja.name);

    const enItems = en.itemListElement as Array<Record<string, unknown>>;
    const jaItems = ja.itemListElement as Array<Record<string, unknown>>;

    assert.equal(enItems[0].name, "EN Care EN Care Row Label（EN Detail）");
    assert.equal(jaItems[0].name, "JA介護 JA介護行（JA詳細）");

    // No character from the other locale's fixture leaks into the EN output.
    for (const item of enItems) {
      assert.doesNotMatch(String(item.name), /JA/);
    }
  });

  // ---------------------------------------------------------------------
  // tc-2: full-width parentheses appended iff `row.detail` is present —
  // exact string match, no trailing space or stray characters either way.
  // ---------------------------------------------------------------------

  test("a row with detail appends （detail）; a row without detail has no parentheses and no trailing space", () => {
    const result = buildPricingJsonLd({ heading: HEADING, courses: COURSES, lang: "en" });
    const items = result.itemListElement as Array<Record<string, unknown>>;

    assert.equal(items[0].name, "EN Care EN Care Row Label（EN Detail）");
    assert.equal(items[1].name, "EN Care EN Night Row Label");
    // No half-width parens leaked in, and no dangling space at the end.
    assert.doesNotMatch(String(items[1].name), /[()]/);
    assert.equal(String(items[1].name).endsWith(" "), false);
  });

  // ---------------------------------------------------------------------
  // tc-3: key order + flattening order + field types.
  // ---------------------------------------------------------------------

  test("top-level and per-item key order is exact; itemListElement is flat and course-major; price/priceCurrency types are correct", () => {
    const result = buildPricingJsonLd({ heading: HEADING, courses: COURSES, lang: "en" });

    assert.deepEqual(Object.keys(result), ["@context", "@type", "name", "itemListElement"]);

    const items = result.itemListElement as Array<Record<string, unknown>>;
    assert.equal(Array.isArray(items), true);
    // Flat: 2 rows from "care" + 1 row from "nursing" = 3 items, not 2
    // nested arrays (which `courses.map` instead of `courses.flatMap`
    // would produce).
    assert.equal(items.length, 3);
    for (const item of items) {
      assert.equal(Array.isArray(item), false);
      assert.deepEqual(Object.keys(item), ["@type", "name", "priceCurrency", "price"]);
      assert.equal(item["@type"], "Offer");
      assert.equal(item.priceCurrency, "JPY");
      assert.equal(typeof item.price, "number");
    }

    // Course-major, row-order within each course: care's two rows first (in
    // their array order), then nursing's one row.
    assert.equal(items[0].name, "EN Care EN Care Row Label（EN Detail）");
    assert.equal(items[1].name, "EN Care EN Night Row Label");
    assert.equal(items[2].name, "EN Nursing EN Nursing Row Label");
    assert.deepEqual(
      items.map((item) => item.price),
      [3740, 5000, 8000],
    );

    assert.equal(result["@context"], "https://schema.org");
    assert.equal(result["@type"], "OfferCatalog");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
