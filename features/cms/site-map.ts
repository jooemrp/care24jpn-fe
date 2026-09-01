/**
 * The pure blocks -> `SiteContent` transform, lifted out of
 * `features/cms/site.ts`, following the exact pattern `merge.ts` established
 * for `client.ts` (see that file's header for the full rationale — the short
 * version: `site.ts` opens with `import "server-only"`, which is not a real
 * installed package outside Next's own bundler, so nothing that lives in
 * `site.ts` can be imported by `node --test`).
 *
 * DELIBERATELY DEPENDENCY-FREE OF THE SERVER RUNTIME: no `server-only`, no
 * `./client`, no `react` (in particular no `cache()`), and — since the
 * no-fallback sweep — no `@/constants/*` VALUE imports. This module MAY
 * import `./types` and `./fields`; `site.ts` is a loader, and loader-layer
 * files are the ones allowed to talk to the CMS. `constants/*.ts` is no
 * longer a data source at render time: the CMS is the single source of
 * truth, and absent/empty fields render as absent/empty.
 *
 * `site.ts` keeps everything that genuinely needs the server: the
 * `getPageBlocks("site")` fetch, `reportUnexpectedContent`, and the
 * per-request `cache()` dedupe. When the fetch or the shape check fails,
 * `mapSite` returns `null` and the consumer surfaces an unavailable chrome
 * rather than stale constants — never a fallback.
 */

import { mapBlocksByType, pickBi, pickImage, pickJa, pickNumber, type BlockTypeList } from "./fields";
import type { Bilingual, CmsBlock } from "./types";

/**
 * Chrome global — brand, nav, contact phone, shared CTA labels, UI chrome
 * labels, footer, error/404/global-error labels. Self-contained: no longer
 * derived from `constants/copy.ts` (the fallback layer is gone), so the
 * field shapes below must match what the consumers (Navbar, Footer,
 * AppShell, error labels provider) render against.
 */
export type FooterLegalLink =
  | { href: string; label: Bilingual }
  | { href: string; key: "tokushoho" };

export type SiteContent = {
  brand: {
    name: string;
    logo: string;
    logoAlt: Bilingual;
    tagline: Bilingual;
    logoWidth: number;
    logoHeight: number;
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
    description: Bilingual;
    legal: Bilingual;
    legalLinks: FooterLegalLink[];
  };
  errorPage: { title: Bilingual; body: Bilingual; retryLabel: Bilingual };
  notFoundPage: {
    eyebrow: string;
    title: Bilingual;
    body: Bilingual;
    homeLabel: Bilingual;
    metaDescription: Bilingual;
  };
  globalErrorPage: { title: Bilingual; body: Bilingual; retryLabel: Bilingual };
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
  "site-not-found-labels",
  "site-global-error-labels",
  "nav-item",
  "site-footer",
  "footer-legal-link",
] as const satisfies BlockTypeList;

/**
 * Maps the "site" page's blocks onto `SiteContent`, BY BLOCK TYPE — the
 * number of blocks and their order are no longer part of the contract.
 *
 * Every field is read straight from the CMS. No fallback to `constants/*.ts`:
 * an empty field renders as empty, exactly as the dashboard holds it.
 *
 * Returns `null` — after calling `reportFallback` — only when a declared
 * block TYPE is entirely missing. That is the one case where the chrome
 * genuinely cannot be assembled; the consumer surfaces it as unavailable
 * rather than serving stale content.
 */
export function mapSite(
  blocks: CmsBlock[],
  reportFallback: (slug: string, detail: string) => void,
): SiteContent | null {
  const groups = mapBlocksByType("site", blocks, SITE_TYPES, reportFallback);
  if (!groups) return null;

  const [brandBlock] = groups["site-brand"];
  const [contactPhoneBlock] = groups["site-contact-phone"];
  const [ctaBlock] = groups["site-cta"];
  const [uiBlock] = groups["site-ui-labels"];
  const [errorLabelsBlock] = groups["site-error-labels"];
  const [notFoundLabelsBlock] = groups["site-not-found-labels"];
  const [globalErrorLabelsBlock] = groups["site-global-error-labels"];
  const [footerBlock] = groups["site-footer"];
  const navBlocks = groups["nav-item"];
  const legalBlocks = groups["footer-legal-link"];

  const brand: SiteContent["brand"] = {
    name: pickJa(brandBlock.data, "name"),
    logo: pickImage(brandBlock.data, "logo", "site/brand"),
    logoAlt: pickBi(brandBlock.data, "logo_alt"),
    tagline: pickBi(brandBlock.data, "tagline"),
    logoWidth: pickNumber(brandBlock.data, "logo_width", "site/brand"),
    logoHeight: pickNumber(brandBlock.data, "logo_height", "site/brand"),
  };

  const contactPhone: SiteContent["contactPhone"] = {
    display: pickJa(contactPhoneBlock.data, "display"),
    tel: pickJa(contactPhoneBlock.data, "tel"),
    note: pickBi(contactPhoneBlock.data, "note"),
  };

  const cta: SiteContent["cta"] = {
    primary: pickBi(ctaBlock.data, "primary"),
    secondary: pickBi(ctaBlock.data, "secondary"),
    contact: pickBi(ctaBlock.data, "contact"),
  };

  const ui: SiteContent["ui"] = {
    menuToggleLabel: pickBi(uiBlock.data, "menu_toggle_label"),
    langToggleLabel: pickBi(uiBlock.data, "lang_toggle_label"),
    tocLabel: pickBi(uiBlock.data, "toc_label"),
    langShortJa: pickJa(uiBlock.data, "lang_short_ja"),
    langShortEn: pickJa(uiBlock.data, "lang_short_en"),
  };

  const errorPage: SiteContent["errorPage"] = {
    title: pickBi(errorLabelsBlock.data, "title"),
    body: pickBi(errorLabelsBlock.data, "body"),
    retryLabel: pickBi(errorLabelsBlock.data, "retry_label"),
  };

  const globalErrorPage: SiteContent["globalErrorPage"] = {
    title: pickBi(globalErrorLabelsBlock.data, "title"),
    body: pickBi(globalErrorLabelsBlock.data, "body"),
    retryLabel: pickBi(globalErrorLabelsBlock.data, "retry_label"),
  };

  const notFoundPage: SiteContent["notFoundPage"] = {
    // `eyebrow` is `pickJa`, not `pickBi`: the field is non-localizable in
    // `scripts/atlas/schema.ts` (the HTTP status "404" reads the same in
    // both locales), so there is no EN translation to merge.
    eyebrow: pickJa(notFoundLabelsBlock.data, "eyebrow"),
    title: pickBi(notFoundLabelsBlock.data, "title"),
    body: pickBi(notFoundLabelsBlock.data, "body"),
    homeLabel: pickBi(notFoundLabelsBlock.data, "home_label"),
    metaDescription: pickBi(notFoundLabelsBlock.data, "meta_description"),
  };

  const nav: SiteContent["nav"] = navBlocks.map((block) => ({
    href: pickJa(block.data, "href"),
    label: pickBi(block.data, "label"),
  }));

  const legalLinks: SiteContent["footer"]["legalLinks"] = legalBlocks.map((block) => {
    const href = pickJa(block.data, "href");
    const useLegalHeading = pickJa(block.data, "use_legal_heading");

    if (useLegalHeading === "tokushoho") {
      return { href, key: "tokushoho" };
    }

    return { href, label: pickBi(block.data, "label") };
  });

  const footer: SiteContent["footer"] = {
    description: pickBi(footerBlock.data, "description"),
    legalLinks,
    legal: pickBi(footerBlock.data, "legal"),
  };

  return { brand, nav, contactPhone, cta, ui, footer, errorPage, notFoundPage, globalErrorPage };
}