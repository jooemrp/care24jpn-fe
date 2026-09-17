/**
 * Runtime route registry only.
 *
 * This module deliberately contains no page titles, descriptions, images, or
 * other rendered content. Those values are read from Atlas at request time.
 * The route path and Atlas slug are application wiring, not a content
 * fallback, and are needed to connect Next route metadata/sitemap requests to
 * the corresponding CMS page.
 */

type RuntimeSeoRoute = {
  route: string;
  atlasSlug: string;
  titleFrom?: "legal-heading";
};

export const seoRoutes = {
  home: { route: "/", atlasSlug: "home" },
  pricing: { route: "/pricing", atlasSlug: "pricing" },
  "service-flow": { route: "/service-flow", atlasSlug: "service-flow" },
  company: { route: "/company", atlasSlug: "company" },
  fees: { route: "/fees", atlasSlug: "fees" },
  "use-case": { route: "/use-case", atlasSlug: "use-case" },
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
  faq: { route: "/faq", atlasSlug: "faq" },
  contact: { route: "/contact", atlasSlug: "contact" },
} satisfies Record<string, RuntimeSeoRoute>;

export type SeoRouteEntry = (typeof seoRoutes)[keyof typeof seoRoutes];
export type SeoRouteKey = keyof typeof seoRoutes;
