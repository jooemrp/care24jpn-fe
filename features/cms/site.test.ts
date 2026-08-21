/**
 * Tests for the "site" loader's block -> `SiteContent` mapping
 * (features/cms/site-map.ts#mapSite, in particular the footer legal-link
 * assembly inside it).
 *
 * Run (from marketing-web/):
 *   npx tsx features/cms/site.test.ts
 *
 * WHY THIS FILE IMPORTS `./site-map`, NOT `./site`. `site.ts` opens with
 * `import "server-only"`, which — same as `client.ts` (see `merge.test.ts`'s
 * header) — is not a real installed package; Next.js aliases it only inside
 * its own bundler. `node --test features/cms/site.ts` (and `npx tsx` the
 * same) fails immediately with `Cannot find module 'server-only'`, before
 * `@/constants/copy` or `react`'s `cache()` even get a chance to resolve.
 *
 * `merge.ts` solved this for `client.ts` by extracting the pure transform
 * into its own dependency-free module; `site-map.ts` does the same for
 * `site.ts`'s block-to-`SiteContent` mapping (see that file's header). This
 * test file imports `mapSite`/`FALLBACK` from `./site-map` FOR REAL — nothing
 * below is a copy of production logic. If `site-map.ts#mapSite` regresses
 * (e.g. `use_legal_heading`'s default goes back to being indexed off
 * `FALLBACK.footer.legalLinks[i]`), these tests fail against the actual
 * code, not a mirror of it.
 *
 * WHY `npx tsx`, NOT PLAIN `node --test` (unlike fields.test.ts/
 * merge.test.ts). `fields.ts`/`merge.ts` are dependency-free at runtime —
 * their only imports are `type`-only, which TypeScript's type stripping
 * erases entirely, so Node's native loader never has to resolve them.
 * `site-map.ts` genuinely needs `./fields`'s pickers and `@/constants/copy`'s
 * fallback data AT RUNTIME (the whole point of extracting it — see that
 * file's header), and those stay ordinary extensionless/`@/`-aliased
 * specifiers so Next's bundler and `tsc` (`moduleResolution: "bundler"`, no
 * `allowImportingTsExtensions`) keep resolving them normally. Node's native
 * ESM loader has neither: no `@/` path-alias support and no
 * extensionless-relative-specifier resolution, so `node --test
 * features/cms/site.test.ts` fails immediately with `Cannot find module
 * '.../fields'` — verified directly against this checkout:
 *
 *   $ node --test features/cms/site.test.ts
 *   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../features/cms/fields'
 *
 * `tsx` resolves both (path aliases via tsconfig, and extensions via esbuild),
 * so this file runs correctly only under `tsx` — the exact same split
 * `legal-html.test.ts` already documents and `package.json#test` already
 * uses for it (`node --test` for what it can reach, `npx tsx` for what
 * genuinely needs the bundler-shaped resolution). `package.json#test` runs
 * this file via `npx tsx`, after `legal-html.test.ts`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { Bilingual, CmsBlock } from "./types";
import type * as SiteMapModule from "./site-map.ts";

/** Built at runtime so the literal `.ts` specifier stays out of tsc's static
 * resolution (TS5097) while Node's loader still gets the extension it
 * needs — same trick as fields.test.ts / merge.test.ts. */
const siteMapPath = "./site-map" + ".ts";

function bi(value: string): Bilingual {
  return { ja: value, en: `${value}-en` };
}

function legalBlock(position: number, data: Record<string, unknown>): CmsBlock {
  return {
    id: `legal-${position}`,
    type: "footer-legal-link",
    blockTypeId: "01a01d67-7a9b-70c1-a4fc-a595d3a577a0",
    parentId: null,
    position,
    data,
  };
}

/** A minimal, well-formed block for every OTHER "site" content type, so
 * `mapSite` (which requires all seven declared types to be present) actually
 * runs and reaches the legal-link mapping under test. Field values are
 * irrelevant to every assertion below — only the footer-legal-link blocks
 * vary per test. */
function otherSiteBlocks(): CmsBlock[] {
  const simple = (type: string, position: number, data: Record<string, unknown>): CmsBlock => ({
    id: `${type}-${position}`,
    type,
    blockTypeId: `uuid-of-${type}`,
    parentId: null,
    position,
    data,
  });
  return [
    simple("site-brand", 0, { name: bi("Care 24"), logo_alt: bi("logo"), tagline: bi("tag") }),
    simple("site-contact-phone", 1, { display: bi("0120"), tel: bi("0120"), note: bi("note") }),
    simple("site-cta", 2, { primary: bi("p"), secondary: bi("s"), contact: bi("c") }),
    simple("site-ui-labels", 3, { menu_toggle_label: bi("m"), lang_toggle_label: bi("l") }),
    simple("site-error-labels", 4, { title: bi("t"), body: bi("b"), retry_label: bi("r") }),
    simple("nav-item", 5, { href: bi("/"), label: bi("Home") }),
    simple("site-footer", 6, { description: bi("d"), legal: bi("c 2026") }),
  ];
}

async function main(): Promise<void> {
  const siteMap = (await import(siteMapPath)) as typeof SiteMapModule;
  const { mapSite, FALLBACK } = siteMap;
  const noop = () => {};

  // ---------------------------------------------------------------------------
  // Fixtures — shaped like the live "site" page's 5 footer-legal-link blocks
  // (scripts/atlas/live-snapshot.json): only ONE block (the tokushoho one)
  // carries `use_legal_heading`, and every block carries its own `href` +
  // (except tokushoho) `label`.
  // ---------------------------------------------------------------------------

  /** Same order `constants/copy.ts#footer.legalLinks` declares — matches the
   * live workspace today. */
  function liveOrderLegalBlocks(): CmsBlock[] {
    return [
      legalBlock(9, { href: bi("/company"), label: bi("運営会社") }),
      legalBlock(10, { href: bi("/privacy"), label: bi("プライバシーポリシー") }),
      legalBlock(11, { href: bi("/tokushoho"), use_legal_heading: bi("tokushoho") }),
      legalBlock(12, { href: bi("/terms-for-users"), label: bi("利用規約（ご利用者様向け）") }),
      legalBlock(13, {
        href: bi("/terms-for-care-supporters"),
        label: bi("利用規約（ケアサポーター向け）"),
      }),
    ];
  }

  /** The SAME 5 blocks, dragged into a different dashboard order: the
   * tokushoho block moved to the front. `mapSite` reaches every block's
   * `type` group through `mapBlocksByType`, which SORTS each group by
   * `position` regardless of the order the blocks arrive in an array — so a
   * true dashboard reorder must swap `position` values, not just array
   * order, to reach `mapSite` the same way a real drag in the dashboard
   * would (Atlas reassigns each block's `position` on reorder). Every
   * block's OWN data (href/label/use_legal_heading) is untouched — only
   * position changes. */
  function reorderedLegalBlocks(): CmsBlock[] {
    const [company, privacy, tokushoho, terms, termsCs] = liveOrderLegalBlocks();
    return [
      { ...tokushoho, position: 9 },
      { ...company, position: 10 },
      { ...privacy, position: 11 },
      { ...terms, position: 12 },
      { ...termsCs, position: 13 },
    ];
  }

  function siteBlocks(legalBlocks: CmsBlock[]): CmsBlock[] {
    return [...otherSiteBlocks(), ...legalBlocks];
  }

  type LegalLink = { href: string; key: "tokushoho" } | { href: string; label: Bilingual };

  function legalLinksOf(blocks: CmsBlock[]): LegalLink[] {
    const result = mapSite(blocks, noop);
    assert.ok(result, "mapSite must succeed for a full set of site blocks");
    return result.footer.legalLinks;
  }

  // ---------------------------------------------------------------------------
  // (a) CMS-off / missing-blocks parity: FALLBACK.footer.legalLinks itself is
  // unaffected by anything in this file — mapSite() returns null (never
  // reaches the legal-link mapping) when a declared block type is entirely
  // absent, and site.ts's fetchSite() serves FALLBACK verbatim in that case.
  // ---------------------------------------------------------------------------

  test("CMS-off path: FALLBACK.footer.legalLinks is untouched by this change", () => {
    assert.equal(FALLBACK.footer.legalLinks.length, 5);
    assert.deepEqual(FALLBACK.footer.legalLinks[2], { href: "/tokushoho", key: "tokushoho" });
    assert.deepEqual(FALLBACK.footer.legalLinks[0], {
      href: "/company",
      label: { ja: "運営会社", en: "Operating Company" },
    });
  });

  test("mapSite() returns null (never builds legalLinks) when footer-legal-link blocks are entirely missing", () => {
    const result = mapSite(otherSiteBlocks(), noop);
    assert.equal(result, null);
  });

  // ---------------------------------------------------------------------------
  // (b) live order: tokushoho block gets the heading key, every other block
  // gets its own label — proven against the real `mapSite`.
  // ---------------------------------------------------------------------------

  test("live order: tokushoho block gets the heading key, every other block gets its own label", () => {
    const result = legalLinksOf(siteBlocks(liveOrderLegalBlocks()));
    assert.deepEqual(result[0], { href: "/company", label: bi("運営会社") });
    assert.deepEqual(result[1], { href: "/privacy", label: bi("プライバシーポリシー") });
    assert.deepEqual(result[2], { href: "/tokushoho", key: "tokushoho" });
    assert.deepEqual(result[3], { href: "/terms-for-users", label: bi("利用規約（ご利用者様向け）") });
    assert.deepEqual(result[4], {
      href: "/terms-for-care-supporters",
      label: bi("利用規約（ケアサポーター向け）"),
    });
  });

  // ---------------------------------------------------------------------------
  // (c) the regression this mapping guards against — proven against the real
  // `mapSite`, not a mirror. If `site-map.ts` ever reverts to indexing
  // `use_legal_heading`'s default off `FALLBACK.footer.legalLinks[i]`, this
  // test fails.
  // ---------------------------------------------------------------------------

  test("fix: reordering legal links in the dashboard changes no link's label or heading", () => {
    const reordered = legalLinksOf(siteBlocks(reorderedLegalBlocks()));
    const original = legalLinksOf(siteBlocks(liveOrderLegalBlocks()));

    // Same 5 logical links, same content each — only their position in the
    // array differs, matching the reorder.
    const byHref = (links: LegalLink[]) =>
      Object.fromEntries(links.map((link) => [link.href, link]));
    assert.deepEqual(byHref(reordered), byHref(original));

    // Named explicitly: exactly one link carries `key: "tokushoho"`, and it
    // is the tokushoho link — never the privacy link that now sits at its
    // old array index (2), which is exactly what the pre-fix,
    // index-based default handed the "tokushoho" heading to.
    const tokushohoLinks = reordered.filter((link) => "key" in link);
    assert.equal(tokushohoLinks.length, 1);
    assert.equal(tokushohoLinks[0]?.href, "/tokushoho");

    const privacyLink = reordered.find((link) => link.href === "/privacy");
    assert.ok(privacyLink && "label" in privacyLink, "privacy link must keep its own label");
  });

  // ---------------------------------------------------------------------------
  // (d) a legal link with no CMS `href`/`label` at all falls back to
  // `constants/copy.ts` BY INDEX, same as before this task — only
  // `use_legal_heading`'s default changed, not the href/label fallback.
  // ---------------------------------------------------------------------------

  test("a legal link missing its own href/label falls back to constants/copy.ts by index", () => {
    const blocks = siteBlocks([legalBlock(9, {})]);
    const result = legalLinksOf(blocks);
    assert.deepEqual(result[0], FALLBACK.footer.legalLinks[0]);
  });

  // ---------------------------------------------------------------------------
  // (e) F-1 audit fix: `app/[lang]/error.tsx`'s title/body/retry-button text
  // now comes from a "site-error-labels" block, wired through the SAME
  // `pickBi` + `mapSite` machinery as every other `site.ui.*` field. These
  // lock the field mapping (`title`/`body`/`retry_label` on the wire ->
  // `errorPage.title`/`.body`/`.retryLabel` on `SiteContent`) so a rename on
  // either side fails here instead of silently going dead (the exact failure
  // mode `tab_switch_label`/`toc_label` already suffered once each).
  // ---------------------------------------------------------------------------

  function siteBlocksWithLegal(extra: Partial<Record<string, unknown>> = {}): CmsBlock[] {
    const base = otherSiteBlocks().filter((b) => b.type !== "site-error-labels");
    const errorLabels: CmsBlock = {
      id: "site-error-labels-0",
      type: "site-error-labels",
      blockTypeId: "uuid-of-site-error-labels",
      parentId: null,
      position: 4,
      data: { title: bi("エラー"), body: bi("本文"), retry_label: bi("再試行"), ...extra },
    };
    return [...base, errorLabels, ...liveOrderLegalBlocks()];
  }

  test("mapSite() returns null when the site-error-labels block type is entirely missing", () => {
    const blocks = otherSiteBlocks()
      .filter((b) => b.type !== "site-error-labels")
      .concat(liveOrderLegalBlocks());
    assert.equal(mapSite(blocks, noop), null);
  });

  test("mapSite() reads title/body/retry_label off the site-error-labels block into errorPage.title/.body/.retryLabel", () => {
    const result = mapSite(siteBlocksWithLegal(), noop);
    assert.ok(result, "mapSite must succeed for a full set of site blocks");
    assert.deepEqual(result.errorPage, {
      title: bi("エラー"),
      body: bi("本文"),
      retryLabel: bi("再試行"),
    });
  });

  test("a site-error-labels block missing a field falls back to constants/copy.ts#errorPage for that field only", () => {
    const result = mapSite(siteBlocksWithLegal({ body: undefined }), noop);
    assert.ok(result, "mapSite must succeed for a full set of site blocks");
    assert.deepEqual(result.errorPage.title, bi("エラー"));
    assert.deepEqual(result.errorPage.body, FALLBACK.errorPage.body);
    assert.deepEqual(result.errorPage.retryLabel, bi("再試行"));
  });

  test("CMS-off path: FALLBACK.errorPage matches today's hardcoded error.tsx copy", () => {
    assert.deepEqual(FALLBACK.errorPage, {
      title: { ja: "エラーが発生しました", en: "Something went wrong" },
      body: { ja: "しばらくしてから再度お試しください。", en: "Please try again in a moment." },
      retryLabel: { ja: "再試行", en: "Try again" },
    });
  });
}

void main();
