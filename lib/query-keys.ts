/**
 * One source of truth for client-query identities.
 *
 * Static keys are frozen by reference so callers cannot accidentally create
 * subtly different shapes. Parameterized keys are small factories because
 * the page slug is part of the resource identity.
 */
export const queryKeys = {
  site: ["site"] as const,
  legalHeading: (slug: string) => ["legal-heading", slug] as const,
  home: ["home"] as const,
  useCase: ["use-case"] as const,
  serviceFlow: ["service-flow"] as const,
  company: ["company"] as const,
  faq: ["faq"] as const,
  rates: ["rates"] as const,
  pricing: ["pricing"] as const,
  fees: ["fees"] as const,
  contact: {
    content: ["contact", "content"] as const,
    submit: ["contact", "submit"] as const,
  },
} as const;
