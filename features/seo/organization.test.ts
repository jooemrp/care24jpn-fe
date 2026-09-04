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
 * Missing or malformed CMS rows must fail loudly. These tests deliberately
 * avoid a constants-backed fixture so a passing assertion cannot conceal a
 * bundled-content fallback.
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
    key: "trade-name",
    label: bi("商号", "Trade name"),
    value: bi("メディカルインフォマティクス株式会社", "MedicalInformatics Co.,Ltd."),
  },
  {
    key: "head-office",
    label: bi("本社", "Head office"),
    value: bi(
      "〒100-0005 東京都千代田区丸の内二丁目1番1号 明治生命館4階",
      "Meiji Seimei Building 4F, 2-1-1 Marunouchi, Chiyoda-ku, Tokyo 100-0005",
    ),
  },
  {
    key: "established",
    label: bi("設立", "Established"),
    value: bi("2002年10月18日", "October 18, 2002"),
  },
];

const COMPANY_ROWS_B: OrganizationModule.CompanyRow[] = [
  {
    key: "trade-name",
    label: bi("商号", "Trade name"),
    value: bi("サンプル株式会社", "Sample Care Holdings K.K."),
  },
  {
    key: "head-office",
    label: bi("本社", "Head office"),
    value: bi(
      "〒530-0001 大阪府大阪市北区梅田三丁目1番1号 サンプルビル9階",
      "Sample Building 9F, 3-1-1 Umeda, Kita-ku, Osaka 530-0001",
    ),
  },
  {
    key: "established",
    label: bi("設立", "Established"),
    value: bi("2015年4月1日", "April 1, 2015"),
  },
];

/** company_rows carrying every OTHER field but missing the stable keys — a
 * malformed backend response that must not be repaired from bundled copy. */
const COMPANY_ROWS_RENAMED: OrganizationModule.CompanyRow[] = [
  { label: bi("会社名", "Company name"), value: bi("リネーム株式会社", "Renamed Co., Ltd.") },
  { label: bi("本社所在地", "Office location"), value: bi("どこか", "Somewhere") },
  { label: bi("創業", "Founded"), value: bi("いつか", "Someday") },
];

async function main() {
  const { buildOrganizationJsonLd } = (await import(organizationPath)) as typeof OrganizationModule;

  const baseInput = {
    brandName: "Care 24 Japan",
    telephone: "0120-000-000",
    logoUrl: "https://cdn.example.com/logo.png",
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

  test("missing logoUrl is rejected instead of omitting the backend image", () => {
    assert.throws(
      () =>
        buildOrganizationJsonLd({
          ...baseInput,
          logoUrl: "",
          companyRows: COMPANY_ROWS_A,
        }),
      (error: unknown) => {
        const candidate = error as { name?: string; code?: string };
        return (
          candidate.name === "CmsContentError" &&
          candidate.code === "CMS_MISSING_REQUIRED_FIELD"
        );
      },
    );
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
  // A renamed row label is malformed backend content. It must surface as a
  // typed error rather than silently borrowing a constants-backed row.
  // ---------------------------------------------------------------------

  test("renamed company rows throw a typed content error instead of using constants", () => {
    assert.throws(
      () =>
        buildOrganizationJsonLd({
          ...baseInput,
          companyRows: COMPANY_ROWS_RENAMED,
        }),
      (error: unknown) => {
        const candidate = error as {
          name?: string;
          code?: string;
          fields?: string[];
        };
        return (
          candidate.name === "CmsContentError" &&
          candidate.code === "CMS_MISSING_REQUIRED_FIELD" &&
          candidate.fields?.some((field) => field.includes("trade-name")) === true
        );
      },
    );
  });

  test("an unparseable Head office address throws a typed content error", () => {
    assert.throws(
      () =>
        buildOrganizationJsonLd({
          ...baseInput,
          companyRows: [
            COMPANY_ROWS_A[0]!,
            {
              ...COMPANY_ROWS_A[1]!,
              value: bi("どこか", "not a parseable address"),
            },
            COMPANY_ROWS_A[2]!,
          ],
        }),
      (error: unknown) => {
        const candidate = error as { name?: string; code?: string };
        return (
          candidate.name === "CmsContentError" &&
          candidate.code === "CMS_INVALID_REQUIRED_FIELD"
        );
      },
    );
  });

  test("an unparseable Established date throws a typed content error", () => {
    assert.throws(
      () =>
        buildOrganizationJsonLd({
          ...baseInput,
          companyRows: [
            COMPANY_ROWS_A[0]!,
            COMPANY_ROWS_A[1]!,
            {
              ...COMPANY_ROWS_A[2]!,
              value: bi("いつか", "not a date"),
            },
          ],
        }),
      (error: unknown) => {
        const candidate = error as { name?: string; code?: string };
        return (
          candidate.name === "CmsContentError" &&
          candidate.code === "CMS_INVALID_REQUIRED_FIELD"
        );
      },
    );
  });

  // ---------------------------------------------------------------------
  // A company_row that EXISTS with a matching label but whose value.en is
  // empty/whitespace must throw — never emit an empty JSON-LD property.
  // ---------------------------------------------------------------------

  test("an empty Trade name value throws a typed content error", () => {
    assert.throws(
      () =>
        buildOrganizationJsonLd({
          ...baseInput,
          companyRows: [
            { label: bi("商号", "Trade name"), value: bi("空", "   ") },
          ],
        }),
      (error: unknown) => {
        const candidate = error as { name?: string; code?: string };
        return (
          candidate.name === "CmsContentError" &&
          candidate.code === "CMS_INVALID_REQUIRED_FIELD"
        );
      },
    );
  });

  test("empty Head office and Established values throw typed content errors", () => {
    assert.throws(
      () =>
        buildOrganizationJsonLd({
          ...baseInput,
          companyRows: [
            COMPANY_ROWS_A[0]!,
            { ...COMPANY_ROWS_A[1]!, value: bi("空", "   ") },
            { ...COMPANY_ROWS_A[2]!, value: bi("空", "   ") },
          ],
        }),
      (error: unknown) => {
        const candidate = error as { name?: string; code?: string };
        return (
          candidate.name === "CmsContentError" &&
          candidate.code === "CMS_INVALID_REQUIRED_FIELD"
        );
      },
    );
  });

  // ---------------------------------------------------------------------
  // Relative logoUrl is malformed backend content and must not become a
  // public-image fallback.
  // ---------------------------------------------------------------------

  test("a relative logoUrl throws a typed content error", () => {
    assert.throws(
      () =>
        buildOrganizationJsonLd({
          ...baseInput,
          logoUrl: "/images/logo.png",
          companyRows: COMPANY_ROWS_A,
        }),
      (error: unknown) => {
        const candidate = error as { name?: string; code?: string };
        return (
          candidate.name === "CmsContentError" &&
          candidate.code === "CMS_INVALID_REQUIRED_FIELD"
        );
      },
    );
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
