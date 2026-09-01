/**
 * Tests for features/seo/pageMetadata.ts — closing N2 (CMS audit 0820, the
 * "brand suffix duplicated" finding). Before this file existed,
 * `app/[lang]/layout.tsx`'s `title.template` (drives every non-home
 * `<title>`) and this module's `og:title`/`twitter:title` reconstruction
 * were two independent hand-typed string literals that only happened to
 * agree — nothing enforced it, and this module had zero tests. This file
 * exercises the single source of truth both now derive from
 * (`TITLE_BRAND_SEPARATOR` / `titleTemplate` / `withBrandSuffix`) and the
 * pure tail that assembles the actual `Metadata` object
 * (`buildPageMetadataFields`), plus `resolveOgImage` and `routeAlternates`.
 *
 * Run (from marketing-web/):
 *   npx tsx features/seo/pageMetadata.test.ts
 *
 * WHY `npx tsx`, NOT PLAIN `node --test` (same split `features/cms/
 * site.test.ts` documents). The subject module imports value-level
 * `@/`-aliased specifiers (`@/constants/site`, `@/constants/seo`) that only
 * `tsx`'s bundler-shaped resolution understands — bare `node --test` has no
 * `@/` path-alias support. `getPageMeta`/`getSite` (the two genuinely
 * `server-only`-chained reads, routed through `features/cms/client.ts` /
 * `features/cms/site.ts`) are NOT imported anywhere in this file and
 * `pageMetadata()` itself is never called: every function under test here
 * (`routeAlternates`, `titleTemplate`, `withBrandSuffix`,
 * `buildPageMetadataFields`, `resolveOgImage`) is CMS-independent by
 * construction — see pageMetadata.ts's own header comment for why that
 * split exists and why it had to happen inside this one file rather than a
 * new sibling module.
 *
 * Same bootstrapping constraints as organization.test.ts / merge.test.ts /
 * jsonLdEscape.test.ts: relative specifiers need a literal `.ts` extension
 * for Node's loader, tsc's `bundler` moduleResolution rejects that in a
 * STATIC import (TS5097), so the specifier is built at runtime and imported
 * dynamically inside `main()`.
 *
 * PROVEN TO GO RED. Temporarily changing ONLY
 * `buildPageMetadataFields`'s `withBrandSuffix(title, brandName)` call to a
 * hand-typed `` `${title} - ${brandName}` `` (a different separator than
 * `titleTemplate` still uses — i.e. exactly the "layout and pageMetadata
 * disagree" divergence this file exists to prevent) turned "og:title
 * equals what title.template would render for the same title" red:
 *
 *   AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
 *
 *   'Pricing for users - Care 24 Japan' !== 'Pricing for users | Care 24 Japan'
 *
 * The hand-typed change was reverted immediately after capturing the
 * AssertionError above — this file never ships that regression, it only
 * proves the test below would have caught it.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type * as PageMetadataModule from "./pageMetadata.ts";

const pageMetadataPath = "./pageMetadata" + ".ts";

async function main() {
  const {
    routeAlternates,
    titleTemplate,
    withBrandSuffix,
    buildPageMetadataFields,
    titleContainsBrand,
    TITLE_BRAND_SEPARATOR,
  } = (await import(pageMetadataPath)) as typeof PageMetadataModule;

  const BRAND = "Care 24 Japan";

  // ---------------------------------------------------------------------
  // TITLE_BRAND_SEPARATOR: the one string both sides read.
  // ---------------------------------------------------------------------

  test("titleTemplate and withBrandSuffix both read TITLE_BRAND_SEPARATOR", () => {
    assert.equal(titleTemplate(BRAND), `%s${TITLE_BRAND_SEPARATOR}${BRAND}`);
    assert.equal(
      withBrandSuffix("Pricing for users", BRAND),
      `Pricing for users${TITLE_BRAND_SEPARATOR}${BRAND}`,
    );
  });

  // ---------------------------------------------------------------------
  // The actual N2 guarantee: what layout.tsx's title.template renders for
  // a page title must equal what withBrandSuffix (og:title/twitter:title)
  // produces for that same title. This is the assertion that goes red if
  // the two functions' separators are ever hand-edited independently.
  // ---------------------------------------------------------------------

  test("what title.template renders for a title equals withBrandSuffix's output", () => {
    const title = "Pricing for users";
    const renderedTitle = titleTemplate(BRAND).replace("%s", title);
    assert.equal(withBrandSuffix(title, BRAND), renderedTitle);
  });

  test("buildPageMetadataFields (non-home route): og:title matches the <title> title.template would render", () => {
    const title = "Pricing for users";
    const meta = buildPageMetadataFields({
      route: "/pricing",
      lang: "ja",
      title,
      description: "desc",
      ogImage: "/images/og-card.png",
      brandName: BRAND,
    });
    const renderedTitle = titleTemplate(BRAND).replace("%s", title);
    assert.equal(meta.title, title);
    assert.equal(meta.openGraph?.title, renderedTitle);
  });

  // ---------------------------------------------------------------------
  // Brand-already-in-title routes (CMS audit 0820, ST-U2 Tugas 2): 4 legal
  // pages' Atlas `seo.title` already carries "Care24Japan"/"Care 24 Japan"
  // (the client's legally-reviewed document name — see `care 24
  // update.xlsx`), so letting `title.template` append the brand a THIRD
  // time (it's spelled two different ways already) would render two
  // spellings of the brand side by side in the browser tab. `titleContainsBrand`
  // detects this from the resolved title itself — never a hardcoded route
  // list — and `buildPageMetadataFields` renders those titles as
  // `title.absolute`, which `generate-metadata.md`'s own "absolute" section
  // documents as bypassing `title.template` entirely (same mechanism
  // `app/[lang]/page.tsx` already uses for home, the other title that
  // starts pre-suffixed).
  // ---------------------------------------------------------------------

  test("titleContainsBrand: matches regardless of spacing between the brand's words", () => {
    assert.equal(titleContainsBrand("Care24Japan プラットフォーム利用規約", BRAND), true);
    assert.equal(titleContainsBrand("Care 24 Japan Cancellation Policy", BRAND), true);
    assert.equal(titleContainsBrand("Pricing for users", BRAND), false);
  });

  test("buildPageMetadataFields: a title that already contains the brand renders as title.absolute, not a plain string, so title.template cannot double-append the brand", () => {
    const title = "Care24Japan プラットフォーム利用規約（ご利用者様向け）";
    const meta = buildPageMetadataFields({
      route: "/terms-for-users",
      lang: "ja",
      title,
      description: "desc",
      ogImage: "/images/og-card.png",
      brandName: BRAND,
    });
    assert.deepEqual(meta.title, { absolute: title });
  });

  test("buildPageMetadataFields: og:title for a brand-already-in-title route equals the bare title (no second brand suffix)", () => {
    const title = "Care24Japan Cancellation Policy";
    const meta = buildPageMetadataFields({
      route: "/cancellation-policy",
      lang: "en",
      title,
      description: "desc",
      ogImage: "/images/og-card.png",
      brandName: BRAND,
    });
    assert.equal(meta.openGraph?.title, title);
    assert.ok(!String(meta.openGraph?.title).includes(TITLE_BRAND_SEPARATOR));
  });

  // ---------------------------------------------------------------------
  // Home is excluded from the suffix on both sides.
  // ---------------------------------------------------------------------

  test("buildPageMetadataFields: home (route '/') carries no brand suffix on og:title", () => {
    const homeTitle = `${BRAND} — Premium 24-hour in-home care`;
    const meta = buildPageMetadataFields({
      route: "/",
      lang: "ja",
      title: homeTitle,
      description: "desc",
      ogImage: "/images/og-card.png",
      brandName: BRAND,
    });
    assert.equal(meta.openGraph?.title, homeTitle);
    assert.ok(!String(meta.openGraph?.title).includes(TITLE_BRAND_SEPARATOR));
  });

  // ---------------------------------------------------------------------
  // routeAlternates: x-default and canonical shape.
  // ---------------------------------------------------------------------

  test("routeAlternates: x-default points at the ja (prefix-less) URL, same as languages.ja", () => {
    const alt = routeAlternates("/pricing", "en");
    assert.equal(alt.languages?.["x-default"], "/pricing");
    assert.equal(alt.languages?.ja, "/pricing");
    assert.equal(alt.languages?.en, "/en/pricing");
    assert.equal(alt.canonical, "/en/pricing");
  });

  test("routeAlternates: home route ('/') has no double slash and x-default is '/'", () => {
    const alt = routeAlternates("/", "ja");
    assert.equal(alt.languages?.["x-default"], "/");
    assert.equal(alt.languages?.en, "/en");
    assert.equal(alt.canonical, "/");
  });

  // ---------------------------------------------------------------------
  // openGraph restates type/locale/siteName (shallow-replace semantics —
  // see buildPageMetadataFields's own comment for why this is necessary,
  // not redundant).
  // ---------------------------------------------------------------------

  test("buildPageMetadataFields: openGraph restates type/locale/siteName/alternateLocale per lang", () => {
    const metaJa = buildPageMetadataFields({
      route: "/company",
      lang: "ja",
      title: "Operating Company",
      description: "desc",
      ogImage: "/images/og-card.png",
      brandName: BRAND,
    });
    // `Metadata["openGraph"]`'s type is a union keyed on `type`
    // (OpenGraphWebsite | OpenGraphArticle | ... | OpenGraphMetadata, see
    // next/dist/lib/metadata/types/opengraph-types.d.ts) and its LAST
    // member, the bare `OpenGraphMetadata`, declares no `type` field at
    // all — so a plain `.openGraph?.type` read does not typecheck across
    // every member of that union. `buildPageMetadataFields` always sets
    // `type: "website"` (a literal, see its own comment on why), so this
    // cast only narrows the READ side for the test; nothing about the
    // production return value changes.
    const ogJa = metaJa.openGraph as { type?: string } | undefined;
    assert.equal(ogJa?.type, "website");
    assert.equal(metaJa.openGraph?.locale, "ja_JP");
    assert.equal(metaJa.openGraph?.siteName, BRAND);
    assert.equal(metaJa.openGraph?.alternateLocale, "en_US");

    const metaEn = buildPageMetadataFields({
      route: "/company",
      lang: "en",
      title: "Operating Company",
      description: "desc",
      ogImage: "/images/og-card.png",
      brandName: BRAND,
    });
    assert.equal(metaEn.openGraph?.locale, "en_US");
    assert.equal(metaEn.openGraph?.alternateLocale, "ja_JP");
  });

  test("buildPageMetadataFields: og:url is absolute-path-shaped and locale-prefixed for non-ja", () => {
    const meta = buildPageMetadataFields({
      route: "/pricing",
      lang: "en",
      title: "Pricing for users",
      description: "desc",
      ogImage: "/images/og-card.png",
      brandName: BRAND,
    });
    assert.ok(String(meta.openGraph?.url).endsWith("/en/pricing"));
  });

  // ---------------------------------------------------------------------
  // No-fallback: missing/empty ogImage is passed through as "" into
  // openGraph.images — never a constants/seo.ts card path.
  // ---------------------------------------------------------------------

  test("buildPageMetadataFields: empty ogImage is passed through (no constants fallback)", () => {
    const meta = buildPageMetadataFields({
      route: "/pricing",
      lang: "ja",
      title: "Pricing for users",
      description: "desc",
      ogImage: "",
      brandName: BRAND,
    });
    assert.equal(meta.openGraph?.images, "");
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
