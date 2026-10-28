import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";
import type { Article } from "../cms/articles-map";
import { localizeHref } from "../lang/i18n";
import { articleAlternates } from "./metadata-fields";

/** Uses the same locale eligibility as page metadata; no request-time dates. */
export function buildArticleSitemapEntries(article: Article): MetadataRoute.Sitemap {
  const paths = articleAlternates(article, "ja").languages as Record<string, string>;
  const languages = Object.fromEntries(Object.entries(paths).map(([lang, path]) => [lang, `${SITE_URL}${path}`]));
  return article.indexableLanguages.map((lang) => ({
    url: `${SITE_URL}${localizeHref(`/helpful-information/${article.slug}`, lang)}`,
    ...(article.updatedAt ? { lastModified: article.updatedAt } : {}),
    alternates: { languages },
  }));
}
