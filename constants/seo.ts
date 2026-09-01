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
    // ST-09: synced to the description approved in
    // output/meta-descriptions-review.md Bagian 1 #6 and now live on
    // page.seo.description (Atlas slug "home") — see that doc's own note
    // that home has no `generateMetadata` today, so this literal (like the
    // Atlas value it mirrors) is currently inert until a later sub-task
    // wires one up; kept in sync anyway per this file's "no stale fallback"
    // rule.
    description: {
      ja: "医療保険や介護保険を利用しない、完全オーダーメイドの介護・看護ご支援サービス。24時間の安心、専門スタッフ、ご家族との連携でお困りごとを解消します。",
      en: "Completely custom-made care and nursing support without medical or long-term care insurance — 24-hour presence, trained staff, family partnership.",
    },
  },
  pricing: {
    route: "/pricing",
    atlasSlug: "pricing",
    // Title is a short JA string; the root layout's title.template appends
    // the brand name, so it must not be repeated here.
    title: { ja: "ご利用者様向け料金", en: "Pricing for users" },
    // ST-09: synced to output/meta-descriptions-review.md Bagian 1 #1 / now
    // live on page.seo.description. Replaces the former literal, which
    // quoted 3,740円/6,600円 that could drift from the CMS-sourced rates
    // page (see git history) — the approved draft deliberately omits any
    // price figure for exactly that reason, so this is not just a ¥/JPY
    // wording fix, it also removes the drift risk.
    description: {
      ja: "入会金・登録料は無料、最低利用2時間からご利用いただける、わかりやすい税込料金体系です。内容により変動する場合があるCare 24 Japanの料金ページ。",
      en: "Transparent, all-inclusive pricing. No membership or registration fee, minimum usage 2 hours, all prices tax included. Care 24 Japan pricing for users.",
    },
  },
  "service-flow": {
    route: "/service-flow",
    atlasSlug: "service-flow",
    title: { ja: "ご利用の流れ", en: "How it works" },
    // ST-09: synced to output/meta-descriptions-review.md Bagian 1 #2 / now
    // live on page.seo.description. Drops the old "four steps" wording on
    // purpose (see that doc) so this description doesn't go stale if an
    // editor adds/removes a `service-flow-step` block in Atlas.
    description: {
      ja: "ご登録からケアサポーターとのご予約確定、ご自宅への訪問、サービス終了後のご報告レポートまで、順を追ってご案内するCare 24 Japanのご利用の流れです。",
      en: "From member registration through your care supporter's home visit to the completion report — how Care 24 Japan's service flow works, step by step.",
    },
  },
  company: {
    route: "/company",
    atlasSlug: "company",
    title: { ja: "運営会社", en: "Operating Company" },
    // ST-09: synced to output/meta-descriptions-review.md Bagian 1 #3 / now
    // live on page.seo.description.
    description: {
      ja: "メディカルインフォマティクス株式会社の商号・本社所在地・設立年月日・資本金・代表者など、Care 24 Japan運営会社の会社概要をご案内します。",
      en: "Company profile of MedicalInformatics Co., Ltd., the operator of Care 24 Japan — trade name, head office, establishment date, capital and representative.",
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
    // ST-09: synced to output/meta-descriptions-review.md Bagian 1 #4 / now
    // live on page.seo.description. Also closes the ¥-leaks-to-EN-readers
    // finding (ST-U1): the old literal used "Care 24 Japan" prose with no
    // ¥/JPY figure, so there was nothing to convert here — the description
    // itself changed for the "no stale price" reason above, not a
    // ¥->JPY substitution.
    description: {
      ja: "介護コース・看護コースの1時間あたりの単価を税込表記でご案内する、登録料無料のCare 24 Japanケアサポーター時給・給与体系ページです。",
      en: "Care 24 Japan's hourly wage and salary system for care supporters, showing tax-included hourly rates for the caregiving and nursing courses.",
    },
  },
  "use-case": {
    route: "/use-case",
    atlasSlug: "use-case",
    title: { ja: "ご利用シーン", en: "Use cases" },
    // ST-09: synced to output/meta-descriptions-review.md Bagian 1 #5 / now
    // live on page.seo.description.
    description: {
      ja: "退院後の生活支援、認知症ケア、ご家族のためのレスパイトケア、終末期ケアなど、Care 24 Japanの在宅ケアが役立つさまざまな暮らしの場面をご紹介します。",
      en: "After hospital discharge, dementia care, respite for family caregivers, and end-of-life support — situations Care 24 Japan's in-home care helps with.",
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
  faq: {
    route: "/faq",
    atlasSlug: "faq",
    title: {
      ja: "よくあるご質問",
      en: "Frequently Asked Questions",
    },
    description: {
      ja: "Care24Japanのサービス内容・ケアサポーター・料金・ご予約など、よくいただくご質問（Q1〜Q24）とご利用シーン（S1〜S5）をまとめました。",
      en: "Answers to common questions about Care24Japan's services, care supporters, pricing, and reservations — 24 questions plus 5 use-case scenarios.",
    },
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
