/**
 * Care 24 Japan — per-route SEO metadata, fallback layer.
 *
 * RULES (per project convention, same as every other `constants/*.ts`):
 * - This is the FALLBACK layer, not the source of content. It exists so
 *   `features/seo/pageMetadata.ts` always has something to return even
 *   before a CMS-driven `page.seo` read is wired in (that is a later
 *   sub-task — this file is read-only data today).
 * - Values below are copied VERBATIM out of each route's former inline
 *   `generateMetadata`. Do not "fix" wording, punctuation or numbers here
 *   without a deliberate content change elsewhere first — several entries
 *   below are KNOWN to diverge from other copy for the same page (see the
 *   comments on `fees` and `pricing`) and that divergence is preserved on
 *   purpose.
 *
 * Legal routes (`titleFrom: "legal-heading"`) have no literal title/
 * description here: their title is the CMS/`constants/legal.ts` doc heading
 * and their description is a template built from that heading plus the
 * brand name. `features/seo/pageMetadata.ts` builds both from the `legal`
 * option the page passes in, so the template itself exists in exactly one
 * place instead of 7.
 */

import type { Bilingual } from "./copy";

type LiteralSeoRoute = {
  route: string;
  atlasSlug: string;
  title: Bilingual;
  description: Bilingual;
};

type LegalSeoRoute = {
  route: string;
  atlasSlug: string;
  titleFrom: "legal-heading";
};

export type SeoRouteEntry = LiteralSeoRoute | LegalSeoRoute;

export const seoRoutes = {
  home: {
    route: "/",
    atlasSlug: "home",
    // Copied VERBATIM from what the homepage renders TODAY, per
    // app/[lang]/layout.tsx (`title.default` / `description`), both
    // sourced there from `getSite()`'s CMS-with-fallback `brand.name` /
    // `brand.tagline` — NOT re-typed from memory. `brand.name`/`tagline`
    // defaults live in `constants/copy.ts#brand`; `features/cms/site-map.ts`
    // (`mapSite`) reads the CMS `site-brand` block over that fallback.
    // ST-HOME wires this entry into its own `generateMetadata`; how it
    // avoids double-appending the brand name via the root layout's
    // `title.template` (`%s | ${brand.name}`) is that sub-task's concern,
    // not this literal's.
    title: {
      ja: "Care 24 Japan — ご自宅で、心安らぐ24時間の在宅ケアを",
      en: "Care 24 Japan — Premium 24-hour in-home care",
    },
    description: {
      ja: "ご自宅で、心安らぐ24時間の在宅ケアを",
      en: "Premium 24-hour in-home care",
    },
  },
  pricing: {
    route: "/pricing",
    atlasSlug: "pricing",
    // Title/description are short JA strings; the root layout's
    // title.template appends the brand name, so it must not be repeated
    // here. NOTE: this description's literal prices (3,740円 / 6,600円) are
    // known to be able to drift from the CMS-sourced rates rendered on the
    // page itself — preserved as-is per this file's header rule (verbatim
    // copy, no silent "fixing" of a known divergence).
    title: { ja: "ご利用者様向け料金", en: "Pricing for users" },
    description: {
      ja: "介護コース1時間3,740円、看護コース1時間6,600円（税込・日中料金）。Care 24 Japanの在宅ケア料金をご案内します。",
      en: "Caregiving course ¥3,740/hour, nursing course ¥6,600/hour (daytime, tax included). Care 24 Japan in-home care pricing.",
    },
  },
  "service-flow": {
    route: "/service-flow",
    atlasSlug: "service-flow",
    title: { ja: "ご利用の流れ", en: "How it works" },
    description: {
      ja: "ご登録からサービス終了まで、4つのステップでご利用いただけます。Care 24 Japanのサービス利用の流れをご案内します。",
      en: "From registration to completion, in four simple steps. How to use Care 24 Japan's services.",
    },
  },
  company: {
    route: "/company",
    atlasSlug: "company",
    title: { ja: "運営会社", en: "Operating Company" },
    description: {
      ja: "Care 24 Japanを運営するメディカルインフォマティクス株式会社の会社概要（商号・所在地・設立・資本金など）をご案内します。",
      en: "Company profile of MedicalInformatics Co.,Ltd., the operator of Care 24 Japan — trade name, head office, establishment, capital and more.",
    },
  },
  fees: {
    route: "/fees",
    atlasSlug: "fees",
    // SEO title recommended by the client sheet for the /fees URL. The
    // brand suffix is appended once by the root layout's title.template, so
    // it must not be repeated here. NOTE: this title ("…報酬体系一覧") is
    // known to diverge from the page's own CMS-sourced H1 ("…給与体系") —
    // preserved as-is per this file's header rule (verbatim copy, no silent
    // "fixing" of a known divergence).
    title: {
      ja: "ケアサポーターの時給・報酬体系一覧",
      en: "Hourly wage/salary system for care supporters",
    },
    description: {
      ja: "Care24Japan ケアサポーターの時給・給与体系。介護コース・看護コースの1時間単価（税込）をご案内します。",
      en: "Care 24 Japan care-supporter hourly wage and salary system. Hourly rates (tax included) for the caregiving and nursing courses.",
    },
  },
  "use-case": {
    route: "/use-case",
    atlasSlug: "use-case",
    title: { ja: "ご利用シーン", en: "Use cases" },
    description: {
      ja: "退院後のサポート、認知症のケア、レスパイトケア、終末期ケアなど、Care 24 Japanの在宅ケアがお役に立てるさまざまな暮らしの場面をご紹介します。",
      en: "After hospital discharge, dementia care, respite for families, end-of-life home care — the everyday situations where Care 24 Japan's in-home care helps.",
    },
  },
  privacy: {
    route: "/privacy",
    atlasSlug: "legal-privacy",
    titleFrom: "legal-heading",
  },
  "terms-for-users": {
    route: "/terms-for-users",
    atlasSlug: "legal-terms-for-users",
    titleFrom: "legal-heading",
  },
  "terms-for-care-supporters": {
    route: "/terms-for-care-supporters",
    atlasSlug: "legal-terms-for-care-supporters",
    titleFrom: "legal-heading",
  },
  tokushoho: {
    route: "/tokushoho",
    atlasSlug: "legal-tokushoho",
    titleFrom: "legal-heading",
  },
  "quasi-mandate": {
    route: "/quasi-mandate",
    atlasSlug: "legal-quasi-mandate",
    titleFrom: "legal-heading",
  },
  compensation: {
    route: "/compensation",
    atlasSlug: "legal-compensation",
    titleFrom: "legal-heading",
  },
  "cancellation-policy": {
    route: "/cancellation-policy",
    atlasSlug: "legal-cancellation-policy",
    titleFrom: "legal-heading",
  },
} satisfies Record<string, SeoRouteEntry>;

export type SeoRouteKey = keyof typeof seoRoutes;

/**
 * Site-wide `og:image` fallback, per locale — used by
 * `features/seo/pageMetadata.ts` only when a page's Atlas `seo.og_image` is
 * empty (today: 15/15 pages, per ST-05's synthesis D-3). Relative paths on
 * purpose: `metadataBase` (set once at app/[lang]/layout.tsx:45) resolves
 * them to absolute URLs, same contract as every other URL-shaped metadata
 * field. Generated by ST-OG via scripts/atlas/make-og-card.ts — 1200x630,
 * under the crawler size cap, one branded card per locale (JA tagline vs EN
 * tagline).
 */
export const fallbackOgImage: Bilingual = {
  ja: "/images/og-card.png",
  en: "/images/og-card-en.png",
};
