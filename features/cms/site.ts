import "server-only";

import { cache } from "react";
import { getPageBlocks, reportUnexpectedContent } from "./client";
import { mapBlocksByType, pickBi, pickJa, type BlockTypeList } from "./fields";
import type { CmsBlock } from "./types";
import {
  brand as fallbackBrand,
  nav as fallbackNav,
  contactPhone as fallbackContactPhone,
  cta as fallbackCta,
  ui as fallbackUi,
  footer as fallbackFooter,
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
  brand: typeof fallbackBrand;
  nav: typeof fallbackNav;
  contactPhone: typeof fallbackContactPhone;
  cta: typeof fallbackCta;
  ui: typeof fallbackUi;
  footer: typeof fallbackFooter;
};

const FALLBACK: SiteContent = {
  brand: fallbackBrand,
  nav: fallbackNav,
  contactPhone: fallbackContactPhone,
  cta: fallbackCta,
  ui: fallbackUi,
  footer: fallbackFooter,
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
const SITE_TYPES = [
  "site-brand",
  "site-contact-phone",
  "site-cta",
  "site-ui-labels",
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
 */
function mapSite(blocks: CmsBlock[]): SiteContent | null {
  const groups = mapBlocksByType("site", blocks, SITE_TYPES, reportUnexpectedContent);
  if (!groups) return null;

  const [brandBlock] = groups["site-brand"];
  const [contactPhoneBlock] = groups["site-contact-phone"];
  const [ctaBlock] = groups["site-cta"];
  const [uiBlock] = groups["site-ui-labels"];
  const [footerBlock] = groups["site-footer"];
  const navBlocks = groups["nav-item"];
  const legalBlocks = groups["footer-legal-link"];

  const brand: SiteContent["brand"] = {
    name: pickJa(brandBlock.data, "name", FALLBACK.brand.name),
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
    tabSwitchLabel: pickBi(uiBlock.data, "tab_switch_label", FALLBACK.ui.tabSwitchLabel),
  };

  // `FALLBACK.nav[i]` / `FALLBACK.footer.legalLinks[i]` are indexed
  // defensively from here down: an editor may now legitimately have MORE nav
  // items or legal links in the CMS than `constants/copy.ts` declares, in
  // which case there is no constants entry to fall back to for that index —
  // and the CMS value is the one that should win anyway.
  const nav: SiteContent["nav"] = navBlocks.map((block, i) => ({
    href: pickJa(block.data, "href", FALLBACK.nav[i]?.href ?? ""),
    label: pickBi(block.data, "label", FALLBACK.nav[i]?.label ?? { ja: "", en: "" }),
  }));

  const legalLinks: SiteContent["footer"]["legalLinks"] = legalBlocks.map((block, i) => {
    const fallbackLink: (typeof FALLBACK.footer.legalLinks)[number] | undefined =
      FALLBACK.footer.legalLinks[i];
    const href = pickJa(block.data, "href", fallbackLink?.href ?? "");
    const useLegalHeading = pickJa(
      block.data,
      "use_legal_heading",
      fallbackLink && "key" in fallbackLink ? "tokushoho" : "",
    );

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

  return { brand, nav, contactPhone, cta, ui, footer };
}

async function fetchSite(): Promise<SiteContent> {
  const blocks = await getPageBlocks("site");
  if (!blocks) return FALLBACK;
  return mapSite(blocks) ?? FALLBACK;
}

/** Deduped per-render (React `cache()`): every server component that calls
 * `getSite()` on the same request triggers at most one fetch. */
export const getSite = cache(fetchSite);
