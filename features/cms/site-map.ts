/**
 * The pure blocks -> `SiteContent` transform, lifted out of
 * `features/cms/site.ts`, following the exact pattern `merge.ts` established
 * for `client.ts` (see that file's header for the full rationale — the short
 * version: `site.ts` opens with `import "server-only"`, which is not a real
 * installed package outside Next's own bundler, so nothing that lives in
 * `site.ts` can be imported by `node --test`).
 *
 * DELIBERATELY DEPENDENCY-FREE OF THE SERVER RUNTIME: no `server-only`, no
 * `./client`, no `react` (in particular no `cache()`), and no runtime
 * `@/constants/*` imports. The CMS shape is declared here so this module can
 * be tested without bundling or an Atlas connection. Keep it that way:
 * adding `server-only`/`./client`/`react`'s `cache()` here silently takes
 * `site.test.ts` offline again.
 *
 * `site.ts` keeps everything that genuinely needs the server: the
 * `getPageBlocksStrict("site")` fetch and the per-request `cache()` dedupe.
 */

import {
  mapBlocksByType,
  optionalBi,
  optionalJa,
  requiredBi,
  requiredImageUrl,
  requiredJa,
  requiredUrl,
  type BlockTypeList,
} from "./fields.ts";
import type { Bilingual, CmsBlock } from "./types";

/**
 * Chrome global — brand, nav, contact phone, shared CTA labels, UI chrome
 * labels, footer. This is the CMS contract for the shared shell, so rendered
 * values cannot silently drift back to bundled copy.
 */
export type SiteContent = {
  brand: {
    name: string;
    logo: string;
    logoAlt: Bilingual;
    tagline: Bilingual;
  };
  nav: { href: string; label: Bilingual }[];
  contactPhone: { display: string; tel: string; note: Bilingual };
  cta: { primary: Bilingual; secondary: Bilingual; contact: Bilingual };
  ui: {
    menuToggleLabel: Bilingual;
    langToggleLabel: Bilingual;
    tocLabel: Bilingual;
    langShortJa: string;
    langShortEn: string;
  };
  footer: {
    description?: Bilingual;
    legalLinks: (
      | { href: string; key: "tokushoho" }
      | { href: string; label: Bilingual }
    )[];
    legal: Bilingual;
  };
  errorPage: { title: Bilingual; body: Bilingual; retryLabel: Bilingual };
  notFoundPage: {
    eyebrow: string;
    title: Bilingual;
    body: Bilingual;
    homeLabel: Bilingual;
    metaDescription: Bilingual;
  };
};

/**
 * The content types the "site" page is built from. Order matches
 * `scripts/atlas/seed-site.ts`; it carries no meaning at runtime.
 *
 * `nav-item` and `footer-legal-link` carry the SAME fields (`href` + `label`),
 * so nothing about a block's contents can tell them apart. They stay distinct
 * because each block states its own type: `mapBlocksByType` groups on the slug
 * the API returns. Dragging a legal link above a nav item in the dashboard
 * used to put "プライバシーポリシー" in the navbar — now position is not part
 * of a block's identity at all.
 */
export const SITE_TYPES = [
  "site-brand",
  "site-contact-phone",
  "site-cta",
  "site-ui-labels",
  "site-error-labels",
  // A declared type with no matching block is a typed CMS error. A workspace
  // that has not been re-seeded since this line landed has no
  // `site-not-found-labels` block; run `npx tsx scripts/atlas/seed-site.ts`
  // against the environment before deploying this code to it.
  "site-not-found-labels",
  "nav-item",
  "site-footer",
  "footer-legal-link",
] as const satisfies BlockTypeList;

/**
 * The manifest is a separate CMS surface from the rendered site chrome. It
 * needs only the brand name and the Japanese tagline, so it deliberately
 * filters the site page down to `site-brand` before mapping. In particular,
 * an incomplete `site-footer` block must not make `/manifest.webmanifest`
 * fail.
 */
const SITE_MANIFEST_TYPES = ["site-brand"] as const satisfies BlockTypeList;

export type SiteManifestContent = {
  name: string;
  description: string;
};

export function mapSiteManifest(blocks: CmsBlock[]): SiteManifestContent {
  const brandBlocks = blocks.filter((block) => block.type === "site-brand");
  const groups = mapBlocksByType("site", brandBlocks, SITE_MANIFEST_TYPES);
  const [brandBlock] = groups["site-brand"];

  return {
    name: requiredJa(brandBlock.data, "name", "site/site-brand"),
    description: requiredJa(brandBlock.data, "tagline", "site/site-brand"),
  };
}

/**
 * Maps the "site" page's blocks onto `SiteContent`, BY BLOCK TYPE — the
 * number of blocks and their order are no longer part of the contract.
 *
 * The old exact-count guard (`blocks.length !== 14`) meant that adding a
 * single nav item in the dashboard could discard the whole page. A 5th nav
 * item now renders as a 5th nav item; only a genuinely missing block type
 * throws a typed CMS error.
 */
export function mapSite(blocks: CmsBlock[]): SiteContent {
  const groups = mapBlocksByType("site", blocks, SITE_TYPES);

  const [brandBlock] = groups["site-brand"];
  const [contactPhoneBlock] = groups["site-contact-phone"];
  const [ctaBlock] = groups["site-cta"];
  const [uiBlock] = groups["site-ui-labels"];
  const [errorLabelsBlock] = groups["site-error-labels"];
  const [notFoundLabelsBlock] = groups["site-not-found-labels"];
  const [footerBlock] = groups["site-footer"];
  const navBlocks = groups["nav-item"];
  const legalBlocks = groups["footer-legal-link"];

  const brand: SiteContent["brand"] = {
    name: requiredJa(brandBlock.data, "name", "site/site-brand"),
    logo: requiredImageUrl(brandBlock.data, "logo", "site/site-brand"),
    logoAlt: requiredBi(brandBlock.data, "logo_alt", "site/site-brand"),
    tagline: requiredBi(brandBlock.data, "tagline", "site/site-brand"),
  };

  const contactPhone: SiteContent["contactPhone"] = {
    display: requiredJa(contactPhoneBlock.data, "display", "site/site-contact-phone"),
    tel: requiredJa(contactPhoneBlock.data, "tel", "site/site-contact-phone"),
    note: requiredBi(contactPhoneBlock.data, "note", "site/site-contact-phone"),
  };

  const cta: SiteContent["cta"] = {
    primary: requiredBi(ctaBlock.data, "primary", "site/site-cta"),
    secondary: requiredBi(ctaBlock.data, "secondary", "site/site-cta"),
    contact: requiredBi(ctaBlock.data, "contact", "site/site-cta"),
  };

  const ui: SiteContent["ui"] = {
    menuToggleLabel: requiredBi(uiBlock.data, "menu_toggle_label", "site/site-ui-labels"),
    langToggleLabel: requiredBi(uiBlock.data, "lang_toggle_label", "site/site-ui-labels"),
    tocLabel: requiredBi(uiBlock.data, "toc_label", "site/site-ui-labels"),
    langShortJa: requiredJa(uiBlock.data, "lang_short_ja", "site/site-ui-labels"),
    langShortEn: requiredJa(uiBlock.data, "lang_short_en", "site/site-ui-labels"),
  };

  const errorPage: SiteContent["errorPage"] = {
    title: requiredBi(errorLabelsBlock.data, "title", "site/site-error-labels"),
    body: requiredBi(errorLabelsBlock.data, "body", "site/site-error-labels"),
    retryLabel: requiredBi(errorLabelsBlock.data, "retry_label", "site/site-error-labels"),
  };

  const notFoundPage: SiteContent["notFoundPage"] = {
    eyebrow: requiredJa(notFoundLabelsBlock.data, "eyebrow", "site/site-not-found-labels"),
    title: requiredBi(notFoundLabelsBlock.data, "title", "site/site-not-found-labels"),
    body: requiredBi(notFoundLabelsBlock.data, "body", "site/site-not-found-labels"),
    homeLabel: requiredBi(notFoundLabelsBlock.data, "home_label", "site/site-not-found-labels"),
    metaDescription: requiredBi(
      notFoundLabelsBlock.data,
      "meta_description",
      "site/site-not-found-labels",
    ),
  };

  const nav: SiteContent["nav"] = navBlocks.map((block, i) => ({
    href: requiredUrl(block.data, "href", `site/nav-item[${i}]`),
    label: requiredBi(block.data, "label", `site/nav-item[${i}]`),
  }));

  const legalLinks: SiteContent["footer"]["legalLinks"] = legalBlocks.map((block, i) => {
    const context = `site/footer-legal-link[${i}]`;
    const href = requiredUrl(block.data, "href", context);
    // `use_legal_heading` is optional because only the tokushoho block uses
    // the document heading. Every other legal link must provide its own
    // bilingual label.
    const useLegalHeading = optionalJa(block.data, "use_legal_heading", context);

    if (useLegalHeading === "tokushoho") {
      return { href, key: "tokushoho" };
    }

    return { href, label: requiredBi(block.data, "label", context) };
  });

  const footer: SiteContent["footer"] = {
    description: optionalBi(footerBlock.data, "description", "site/site-footer"),
    legalLinks,
    legal: requiredBi(footerBlock.data, "legal", "site/site-footer"),
  };

  return { brand, nav, contactPhone, cta, ui, footer, errorPage, notFoundPage };
}
