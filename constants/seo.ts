/**
 * Care 24 Japan — per-route SEO ROUTE STRUCTURE only (no content values).
 *
 * The no-fallback sweep moved every rendered value into Atlas CMS:
 * title/description/og:image now come from each page's own `seo` object via
 * `getPageMeta()` (features/cms/client.ts). This file no longer carries ANY
 * content — it only maps a route key -> its absolute path + Atlas page slug
 * (and marks the 7 legal routes whose title is the legal-document heading
 * rather than a page `seo.title` literal).
 *
 * The old literal `title`/`description` pairs and the `fallbackOgImage` card
 * are gone. `features/seo/pageMetadata.ts` + `app/sitemap.ts` consume the
 * structure below; a missing CMS value renders as empty, never as stale
 * constants text (see the plan's "keputusan inti": loader returns null/empty,
 * critical structures notFound()/error).
 */

type LiteralSeoRoute = {
  route: string;
  atlasSlug: string;
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
  },
  pricing: {
    route: "/pricing",
    atlasSlug: "pricing",
  },
  "service-flow": {
    route: "/service-flow",
    atlasSlug: "service-flow",
  },
  company: {
    route: "/company",
    atlasSlug: "company",
  },
  fees: {
    route: "/fees",
    atlasSlug: "fees",
  },
  "use-case": {
    route: "/use-case",
    atlasSlug: "use-case",
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
  },
  contact: {
    route: "/contact",
    atlasSlug: "contact",
  },
} satisfies Record<string, SeoRouteEntry>;

export type SeoRouteKey = keyof typeof seoRoutes;