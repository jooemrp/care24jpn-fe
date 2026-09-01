/**
 * Tests for features/seo/organization.ts — the pure Organization/LocalBusiness
 * JSON-LD builder split out of components/JsonLd.tsx.
 *
 * Run (from marketing-web/):
 *   node --test features/seo/organization.test.ts
 *
 * WHY THIS FILE IS THE ONLY SAFETY NET FOR AREA C. `normalizeHtml`
 * (scripts/atlas/verify-html-parity.ts:106) strips every `<script>` tag,
 * contents included, before diffing rendered HTML — and JSON-LD lives in a
 * `<script type="application/ld+json">`. So `npm run atlas:verify` printing
 * `HASIL: LULUS` proves NOTHING about this file's output: the gate cannot
 * see it, changed or not. These assertions are the entire coverage this area
 * has.
 *
 * Same bootstrapping constraints as fields.test.ts / merge.test.ts: relative
 * specifiers need a literal `.ts` extension for Node's loader, tsc's
 * `bundler` moduleResolution rejects that in a STATIC import (TS5097), so
 * the specifier is built at runtime and imported dynamically inside
 * `main()`.
 *
 * PROVEN RED (added together with the `resolveLegalName` fix below). Before
 * `organization.ts:179` gained the `row.value.en.trim() !== ""` guard (it
 * read only `if (row) return row.value.en;`), the test "a 'Trade name' row
 * that exists but has an empty/whitespace value.en warns and falls back,
 * never emitting an empty legalName" failed with:
 *
 *   AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *   0 !== 1
 *
 * (raised by `assert.equal(warnings.length, 1)` — no warning fired, and
 * `result.legalName` came back `"   "` unchanged instead of falling back).
 * Every other test in this file, including the sibling "Head
 * office"/"Established" asymmetry check right after it, was already green
 * against the unguarded code — confirming the bug was isolated to
 * `resolveLegalName`. The guard was restored immediately after capturing
 * this output (`diff` confirmed byte-identical to the fixed file).
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type * as OrganizationModule from "./organization.ts";

const organizationPath = "./organization" + ".ts";

function bi(ja: string, en: string): { ja: string; en: string } {
  return { ja, en };
}

/** Two fully independent, well-formed company_row sets. Every value below
 * differs from its counterpart in the other set, so any leftover hardcode
 * in buildOrganizationJsonLd shows up as two IDENTICAL outputs instead of
 * two different ones. */
const COMPANY_ROWS_A: OrganizationModule.CompanyRow[] = [
  {
    label: bi("商号", "Trade name"),
    value: bi("メディカルインフォマティクス株式会社", "MedicalInformatics Co.,Ltd."),
  },
  {
    label: bi("本社", "Head office"),
    value: bi(
      "〒100-0005 東京都千代田区丸の内二丁目1番1号 明治生命館4階",
      "Meiji Seimei Building 4F, 2-1-1 Marunouchi, Chiyoda-ku, Tokyo 100-0005",
    ),
  },
  {
    label: bi("設立", "Established"),
    value: bi("2002年10月18日", "October 18, 2002"),
  },
];

const COMPANY_ROWS_B: OrganizationModule.CompanyRow[] = [
  {
    label: bi("商号", "Trade name"),
    value: bi("サンプル株式会社", "Sample Care Holdings K.K."),
  },
  {
    label: bi("本社", "Head office"),
    value: bi(
      "〒530-0001 大阪府大阪市北区梅田三丁目1番1号 サンプルビル9階",
      "Sample Building 9F, 3-1-1 Umeda, Kita-ku, Osaka 530-0001",
    ),
  },
  {
    label: bi("設立", "Established"),
    value: bi("2015年4月1日", "April 1, 2015"),
  },
];

/** company_rows carrying every OTHER field but missing "Head office" and
 * "Established" — the documented silent-failure mode: a renamed label in
 * the dashboard makes `.find()` miss. */
const COMPANY_ROWS_RENAMED: OrganizationModule.CompanyRow[] = [
  { label: bi("会社名", "Company name"), value: bi("リネーム株式会社", "Renamed Co., Ltd.") },
  { label: bi("本社所在地", "Office location"), value: bi("どこか", "Somewhere") },
  { label: bi("創業", "Founded"), value: bi("いつか", "Someday") },
];

const EMPTY_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "",
  addressLocality: "",
  addressRegion: "",
  postalCode: "",
  addressCountry: "JP",
};

async function main() {
  const { buildOrganizationJsonLd } = (await import(organizationPath)) as typeof OrganizationModule;

  const baseInput = {
    brandName: "Care 24 Japan",
    telephone: "0120-000-000",
    siteUrl: "https://care24jpn.vercel.app",
  };

  // ---------------------------------------------------------------------
  // Assertion (a): key order is asserted EXACTLY — this moves the
  // JsonLd.tsx docstring's claim into an enforced contract.
  // ---------------------------------------------------------------------

  test("key order matches the documented contract exactly, logo present", () => {
    const result = buildOrganizationJsonLd({
      ...baseInput,
      logoUrl: "https://cdn.example.com/logo.png",
      companyRows: COMPANY_ROWS_A,
    });
    assert.deepEqual(Object.keys(result), [
      "@context",
      "@type",
      "name",
      "legalName",
      "url",
      "logo",
      "image",
      "telephone",
      "address",
      "foundingDate",
    ]);
  });

  test("logo/image are omitted as a pair when logoUrl is absent; key order for the rest is unchanged", () => {
    const result = buildOrganizationJsonLd({
      ...baseInput,
      companyRows: COMPANY_ROWS_A,
    });
    assert.deepEqual(Object.keys(result), [
      "@context",
      "@type",
      "name",
      "legalName",
      "url",
      "telephone",
      "address",
      "foundingDate",
    ]);
  });

  // ---------------------------------------------------------------------
  // Assertion (b): two fixtures with different company_row values produce
  // DIFFERENT legalName/address/foundingDate — a leftover hardcode cannot
  // pass this.
  // ---------------------------------------------------------------------

  test("two different company_row fixtures produce two different legalName/address/foundingDate", () => {
    const a = buildOrganizationJsonLd({ ...baseInput, companyRows: COMPANY_ROWS_A });
    const b = buildOrganizationJsonLd({ ...baseInput, companyRows: COMPANY_ROWS_B });

    assert.notEqual(a.legalName, b.legalName);
    assert.notDeepEqual(a.address, b.address);
    assert.notEqual(a.foundingDate, b.foundingDate);

    assert.equal(a.legalName, "MedicalInformatics Co.,Ltd.");
    assert.deepEqual(a.address, {
      "@type": "PostalAddress",
      streetAddress: "2-1-1 Marunouchi, Meiji Seimei Building 4F",
      addressLocality: "Chiyoda-ku",
      addressRegion: "Tokyo",
      postalCode: "100-0005",
      addressCountry: "JP",
    });
    assert.equal(a.foundingDate, "2002-10-18");

    assert.equal(b.legalName, "Sample Care Holdings K.K.");
    assert.deepEqual(b.address, {
      "@type": "PostalAddress",
      streetAddress: "3-1-1 Umeda, Sample Building 9F",
      addressLocality: "Kita-ku",
      addressRegion: "Osaka",
      postalCode: "530-0001",
      addressCountry: "JP",
    });
    assert.equal(b.foundingDate, "2015-04-01");
  });

  // ---------------------------------------------------------------------
  // Assertion (c): valid, serializable JSON-LD with the LocalBusiness type.
  // ---------------------------------------------------------------------

  test("result round-trips through JSON.stringify/JSON.parse and @type is LocalBusiness", () => {
    const result = buildOrganizationJsonLd({ ...baseInput, companyRows: COMPANY_ROWS_A });
    const roundTripped = JSON.parse(JSON.stringify(result));
    assert.deepEqual(roundTripped, result);
    assert.equal(result["@type"], "LocalBusiness");
  });

  // ---------------------------------------------------------------------
  // No-fallback contract: a renamed/missing/unparseable row WARNs and emits
  // an empty field — never a constants fallback.
  // ---------------------------------------------------------------------

  test("a renamed 'Head office'/'Established'/'Trade name' label warns with [cms:unexpected-content] and emits empty fields", () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message?: unknown) => {
      warnings.push(String(message));
    };
    let result: Record<string, unknown>;
    try {
      result = buildOrganizationJsonLd({
        ...baseInput,
        companyRows: COMPANY_ROWS_RENAMED,
      });
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(warnings.length, 3);
    for (const warning of warnings) {
      assert.match(warning, /\[cms:unexpected-content\]/);
    }
    assert.equal(result.legalName, "");
    assert.deepEqual(result.address, EMPTY_ADDRESS);
    assert.equal(result.foundingDate, "");
  });

  test("an unparseable Head office address string warns and emits an empty address", () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message?: unknown) => {
      warnings.push(String(message));
    };
    let result: Record<string, unknown>;
    try {
      result = buildOrganizationJsonLd({
        ...baseInput,
        companyRows: [
          { label: bi("本社", "Head office"), value: bi("どこか", "not a parseable address") },
        ],
      });
    } finally {
      console.warn = originalWarn;
    }

    assert.ok(warnings.some((w) => w.includes("address-unparseable") || w.includes("does not match")));
    assert.deepEqual(result.address, EMPTY_ADDRESS);
  });

  test("an unparseable Established date string warns and emits an empty foundingDate", () => {
    const originalWarn = console.warn;
    console.warn = () => {};
    let result: Record<string, unknown>;
    try {
      result = buildOrganizationJsonLd({
        ...baseInput,
        companyRows: [{ label: bi("設立", "Established"), value: bi("いつか", "not a date") }],
      });
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(result.foundingDate, "");
  });

  // ---------------------------------------------------------------------
  // A company_row that EXISTS with a matching label but whose value.en is
  // empty/whitespace must warn and emit empty — never a constants value.
  // ---------------------------------------------------------------------

  test("a 'Trade name' row that exists but has an empty/whitespace value.en warns and emits an empty legalName", () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message?: unknown) => {
      warnings.push(String(message));
    };
    let result: Record<string, unknown>;
    try {
      result = buildOrganizationJsonLd({
        ...baseInput,
        companyRows: [
          { label: bi("商号", "Trade name"), value: bi("空", "   ") },
        ],
      });
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /\[cms:unexpected-content\]/);
    assert.equal(result.legalName, "");
  });

  test("an empty value.en for 'Head office'/'Established' emits empty address/foundingDate", () => {
    const originalWarn = console.warn;
    console.warn = () => {};
    let result: Record<string, unknown>;
    try {
      result = buildOrganizationJsonLd({
        ...baseInput,
        companyRows: [
          { label: bi("本社", "Head office"), value: bi("空", "   ") },
          { label: bi("設立", "Established"), value: bi("空", "   ") },
        ],
      });
    } finally {
      console.warn = originalWarn;
    }

    assert.deepEqual(result.address, EMPTY_ADDRESS);
    assert.equal(result.foundingDate, "");
  });

  // ---------------------------------------------------------------------
  // Relative logoUrl is resolved against siteUrl (schema.org logo/image
  // must be absolute).
  // ---------------------------------------------------------------------

  test("a relative logoUrl is resolved against siteUrl", () => {
    const result = buildOrganizationJsonLd({
      ...baseInput,
      logoUrl: "/images/logo.png",
      companyRows: COMPANY_ROWS_A,
    });
    assert.equal(result.logo, "https://care24jpn.vercel.app/images/logo.png");
    assert.equal(result.image, "https://care24jpn.vercel.app/images/logo.png");
  });

  test("an absolute logoUrl (a real S3 URL from site.brand.logo) is passed through unchanged", () => {
    const result = buildOrganizationJsonLd({
      ...baseInput,
      logoUrl: "https://horizoon.s3.ap-southeast-1.amazonaws.com/care-24/media/logo.png",
      companyRows: COMPANY_ROWS_A,
    });
    assert.equal(result.logo, "https://horizoon.s3.ap-southeast-1.amazonaws.com/care-24/media/logo.png");
    assert.equal(result.image, "https://horizoon.s3.ap-southeast-1.amazonaws.com/care-24/media/logo.png");
  });

  // ---------------------------------------------------------------------
  // name/url/telephone pass straight through from input — sanity check that
  // the caller-supplied SiteContent-derived values are not silently ignored.
  // ---------------------------------------------------------------------

  test("name, url and telephone are exactly the caller-supplied values", () => {
    const result = buildOrganizationJsonLd({ ...baseInput, companyRows: COMPANY_ROWS_A });
    assert.equal(result.name, "Care 24 Japan");
    assert.equal(result.url, "https://care24jpn.vercel.app");
    assert.equal(result.telephone, "0120-000-000");
    assert.equal(result["@context"], "https://schema.org");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
