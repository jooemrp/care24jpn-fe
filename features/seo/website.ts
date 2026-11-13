/**
 * Pure builder for the home-page WebSite JSON-LD object.
 *
 * Why it exists: the site only emitted LocalBusiness JSON-LD (see
 * `features/seo/organization.ts`). Google reads the schema.org `WebSite`
 * `name` on the home page to decide the site name shown in search results;
 * without it Google guesses from titles and body text and can keep showing an
 * old spelling of the brand.
 *
 * Same bootstrapping discipline as `organization.ts`: relative imports only,
 * no runtime dependency, so `node --test features/seo/website.test.ts` runs it
 * without a bundler. The brand name comes from the CMS-backed `site` chrome
 * (`site.brand.name`) at the call site; nothing is hardcoded here, and a
 * missing or malformed value throws instead of being replaced.
 *
 * Key order is part of the contract (asserted in the test): `@context`,
 * `@type`, `name`, `url`, `inLanguage`.
 */

export type WebSiteJsonLdInput = {
  /** CMS `site.brand.name`. */
  brandName: string;
  /** Absolute site origin, no trailing slash (`constants/site.ts#SITE_URL`). */
  siteUrl: string;
  /** Language of the page the object is rendered on. */
  lang: string;
};

export function buildWebSiteJsonLd(input: WebSiteJsonLdInput): Record<string, unknown> {
  const name = typeof input.brandName === "string" ? input.brandName.trim() : "";
  if (name === "") {
    throw new Error("WebSite JSON-LD requires a non-empty brand name (CMS site.brand.name).");
  }

  let url: URL;
  try {
    url = new URL(input.siteUrl);
  } catch {
    throw new Error(`WebSite JSON-LD requires an absolute site URL, got "${String(input.siteUrl)}".`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`WebSite JSON-LD requires an http(s) site URL, got "${input.siteUrl}".`);
  }

  const lang = typeof input.lang === "string" ? input.lang.trim() : "";
  if (lang === "") {
    throw new Error("WebSite JSON-LD requires a non-empty language code.");
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: url.origin,
    inLanguage: lang,
  };
}
