/**
 * The pure blocks -> `SiteContent` transform, lifted out of
 * `features/cms/site.ts`, following the exact pattern `merge.ts` established
 * for `client.ts` (see that file's header for the full rationale — the short
 * version: `site.ts` opens with `import "server-only"`, which is not a real
 * installed package outside Next's own bundler, so nothing that lives in
 * `site.ts` can be imported by `node --test`).
 *
 * DELIBERATELY DEPENDENCY-FREE OF THE SERVER RUNTIME: no `server-only`, no
 * `./client`, no `react` (in particular no `cache()`). This module MAY import
 * `./types`, `./fields` and `@/constants/*` — `site.ts` is a loader, and
 * loader-layer files are the ones allowed to read `constants/*.ts`
 * (`features/cms/fields.ts`'s header explains why `fields.ts` itself may
 * not). Keep it that way: adding `server-only`/`./client`/`react`'s `cache()`
 * here silently takes `site.test.ts` offline again.
 *
 * `site.ts` keeps everything that genuinely needs the server: the
 * `getPageBlocks("site")` fetch, `reportUnexpectedContent`, and the
 * per-request `cache()` dedupe.
 */

import { mapBlocksByType, pickBi, pickImage, pickJa, type BlockTypeList } from "./fields";
import type { CmsBlock } from "./types";
import {
  brand as fallbackBrand,
  nav as fallbackNav,
  contactPhone as fallbackContactPhone,
  cta as fallbackCta,
  ui as fallbackUi,
  footer as fallbackFooter,
  errorPage as fallbackErrorPage,
  notFoundPage as fallbackNotFoundPage,
  type Bilingual,
} from "@/constants/copy";

/**
 * Chrome global — brand, nav, contact phone, shared CTA labels, UI chrome
 * labels, footer. Shape is byte-identical to the combined exports of
 * `constants/copy.ts` (`brand`/`nav`/`contactPhone`/`cta`/`ui`/`footer`) —
 * every field type below is derived with `typeof` from those exports, so
 * this type can never silently drift from the fallback shape components
 * already render against.
 */
export type SiteContent = {
  brand: typeof fallbackBrand & { logo: string };
  nav: typeof fallbackNav;
  contactPhone: typeof fallbackContactPhone;
  cta: typeof fallbackCta;
  ui: typeof fallbackUi;
  footer: typeof fallbackFooter;
  errorPage: typeof fallbackErrorPage;
  notFoundPage: typeof fallbackNotFoundPage;
};

/**
 * The logo file bundled in `public/images/`. `constants/copy.ts` holds no
 * image paths at all — until now every `<Image src>` was a literal in JSX —
 * so the literal lives here, next to the CMS field it backs up, and stays the
 * safety net when Atlas is down or its media expansion failed.
 *
 * Navbar and Footer render the SAME file, from the SAME field
 * (`site_brand.logo`), so they cannot drift apart.
 */
export const FALLBACK_LOGO = "/images/logo.png";

export const FALLBACK: SiteContent = {
  brand: { ...fallbackBrand, logo: FALLBACK_LOGO },
  nav: fallbackNav,
  contactPhone: fallbackContactPhone,
  cta: fallbackCta,
  ui: fallbackUi,
  footer: fallbackFooter,
  errorPage: fallbackErrorPage,
  notFoundPage: fallbackNotFoundPage,
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
  // DEPLOY ORDER MATTERS for this one, as it did when `site-error-labels`
  // was added: a declared type with no matching block makes
  // `mapBlocksByType` return `null`, which reverts the ENTIRE site chrome —
  // brand, nav, footer, every page — to `constants/copy.ts`. A workspace
  // that has not been re-seeded since this line landed has no
  // `site-not-found-labels` block. Run `npx tsx scripts/atlas/seed-site.ts`
  // against an environment BEFORE deploying this code to it.
  "site-not-found-labels",
  "nav-item",
  "site-footer",
  "footer-legal-link",
] as const satisfies BlockTypeList;

/**
 * Maps the "site" page's blocks onto `SiteContent`, BY BLOCK TYPE — the
 * number of blocks and their order are no longer part of the contract.
 *
 * The old exact-count guard (`blocks.length !== 14`) meant that adding a
 * single nav item in the dashboard reverted the whole header, footer, brand,
 * phone number and CTA labels to `constants/copy.ts` at once, with no log.
 * Now a 5th nav item simply renders as a 5th nav item; only a genuinely
 * missing block TYPE forces the wholesale fallback, and that path warns.
 *
 * `reportFallback` is threaded through rather than imported (this module may
 * not import `./client`, see the file header) — `site.ts` passes
 * `client.ts#reportUnexpectedContent` in; tests pass a no-op or a capturing
 * stub, same as `fields.test.ts` already does for `mapBlocksByType` directly.
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
  const [footerBlock] = groups["site-footer"];
  const navBlocks = groups["nav-item"];
  const legalBlocks = groups["footer-legal-link"];

  const brand: SiteContent["brand"] = {
    name: pickJa(brandBlock.data, "name", FALLBACK.brand.name),
    logo: pickImage(brandBlock.data, "logo", FALLBACK_LOGO, "site/brand"),
    logoAlt: pickBi(brandBlock.data, "logo_alt", FALLBACK.brand.logoAlt),
    tagline: pickBi(brandBlock.data, "tagline", FALLBACK.brand.tagline),
  };

  const contactPhone: SiteContent["contactPhone"] = {
    display: pickJa(contactPhoneBlock.data, "display", FALLBACK.contactPhone.display),
    tel: pickJa(contactPhoneBlock.data, "tel", FALLBACK.contactPhone.tel),
    note: pickBi(contactPhoneBlock.data, "note", FALLBACK.contactPhone.note),
  };

  const cta: SiteContent["cta"] = {
    primary: pickBi(ctaBlock.data, "primary", FALLBACK.cta.primary),
    secondary: pickBi(ctaBlock.data, "secondary", FALLBACK.cta.secondary),
    contact: pickBi(ctaBlock.data, "contact", FALLBACK.cta.contact),
  };

  const ui: SiteContent["ui"] = {
    menuToggleLabel: pickBi(uiBlock.data, "menu_toggle_label", FALLBACK.ui.menuToggleLabel),
    langToggleLabel: pickBi(uiBlock.data, "lang_toggle_label", FALLBACK.ui.langToggleLabel),
    tocLabel: pickBi(uiBlock.data, "toc_label", FALLBACK.ui.tocLabel),
    langShortJa: pickJa(uiBlock.data, "lang_short_ja", FALLBACK.ui.langShortJa),
    langShortEn: pickJa(uiBlock.data, "lang_short_en", FALLBACK.ui.langShortEn),
  };

  const errorPage: SiteContent["errorPage"] = {
    title: pickBi(errorLabelsBlock.data, "title", FALLBACK.errorPage.title),
    body: pickBi(errorLabelsBlock.data, "body", FALLBACK.errorPage.body),
    retryLabel: pickBi(errorLabelsBlock.data, "retry_label", FALLBACK.errorPage.retryLabel),
  };

  const notFoundPage: SiteContent["notFoundPage"] = {
    // `eyebrow` is `pickJa`, not `pickBi`: the field is non-localizable in
    // `scripts/atlas/schema.ts` (the HTTP status "404" reads the same in
    // both locales), so there is no EN translation to merge.
    eyebrow: pickJa(notFoundLabelsBlock.data, "eyebrow", FALLBACK.notFoundPage.eyebrow),
    title: pickBi(notFoundLabelsBlock.data, "title", FALLBACK.notFoundPage.title),
    body: pickBi(notFoundLabelsBlock.data, "body", FALLBACK.notFoundPage.body),
    homeLabel: pickBi(notFoundLabelsBlock.data, "home_label", FALLBACK.notFoundPage.homeLabel),
    metaDescription: pickBi(
      notFoundLabelsBlock.data,
      "meta_description",
      FALLBACK.notFoundPage.metaDescription,
    ),
  };

  // `FALLBACK.nav[i]` / `FALLBACK.footer.legalLinks[i]` are indexed
  // defensively from here down: an editor may now legitimately have MORE nav
  // items or legal links in the CMS than `constants/copy.ts` declares, in
  // which case there is no constants entry to fall back to for that index —
  // and the CMS value is the one that should win anyway. That is safe for
  // `href`/`label` (and every `nav[i]` field): the fallback only fills a gap
  // when the block's OWN field is empty, it never changes what KIND of thing
  // gets rendered. `use_legal_heading`'s default is different — see the
  // comment on it below — because it decides whether a link renders as the
  // tokushoho document heading at all, so an index-borrowed default there is
  // an identity mix-up, not just a stale value.
  const nav: SiteContent["nav"] = navBlocks.map((block, i) => ({
    href: pickJa(block.data, "href", FALLBACK.nav[i]?.href ?? ""),
    label: pickBi(block.data, "label", FALLBACK.nav[i]?.label ?? { ja: "", en: "" }),
  }));

  const legalLinks: SiteContent["footer"]["legalLinks"] = legalBlocks.map((block, i) => {
    const fallbackLink: (typeof FALLBACK.footer.legalLinks)[number] | undefined =
      FALLBACK.footer.legalLinks[i];
    const href = pickJa(block.data, "href", fallbackLink?.href ?? "");
    // Deliberately NOT `fallbackLink && "key" in fallbackLink ? "tokushoho" : ""`
    // (what this used to read): that made the default depend on `i` lining up
    // with FALLBACK.footer.legalLinks' own order, so reordering legal links in
    // the dashboard could hand an unrelated link the "tokushoho" default and
    // make it render the tokushoho DOCUMENT HEADING instead of its own label
    // (Footer.tsx:99 branches its whole render on this value). The live
    // workspace's one tokushoho block already carries
    // `use_legal_heading: "tokushoho"` as real CMS data (verified in
    // scripts/atlas/live-snapshot.json), so `pickJa` returns it from `block.data`
    // directly and never reaches this default — the default only matters for
    // every OTHER legal link, where it must never be "tokushoho".
    const useLegalHeading = pickJa(block.data, "use_legal_heading", "");

    if (useLegalHeading === "tokushoho") {
      return { href, key: "tokushoho" };
    }

    const fallbackLabel: Bilingual =
      fallbackLink && "label" in fallbackLink && fallbackLink.label !== undefined
        ? fallbackLink.label
        : { ja: "", en: "" };
    return { href, label: pickBi(block.data, "label", fallbackLabel) };
  });

  const footer: SiteContent["footer"] = {
    description: pickBi(footerBlock.data, "description", FALLBACK.footer.description),
    legalLinks,
    legal: pickBi(footerBlock.data, "legal", FALLBACK.footer.legal),
  };

  return { brand, nav, contactPhone, cta, ui, footer, errorPage, notFoundPage };
}
