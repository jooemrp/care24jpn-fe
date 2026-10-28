import type { Metadata } from "next";
import type { Article } from "../cms/articles-map";
import { cmsFieldErrorMarker, isCmsFieldErrorMarker } from "../cms/fields";
import type { PageMeta } from "../cms/types";
import type { Lang } from "../lang/i18n";
import { buildPageMetadataFields } from "../seo/pageMetadata";
import { localizeHref } from "../lang/i18n";
import { SITE_URL } from "@/constants/site";

/** Optional article media falls back to the hub; invalid media is diagnosed. */
export function articleOgImage(value: string | undefined, lang: Lang): string {
  if (value && isCmsFieldErrorMarker(value)) return value;
  if (value) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || url.protocol === "http:") return value;
    } catch { /* Report the field below. */ }
  }
  return cmsFieldErrorMarker(`articles.seo.og_image.${lang}`);
}

export function articleSeoFields(article: Article, hub: PageMeta, lang: Lang) {
  const contentLang = article.indexableLanguages.includes(lang) ? lang : "ja";
  const override = article.seo.ogImage?.[contentLang];
  const image = override ? articleOgImage(override, contentLang) : articleOgImage(hub.ogImage?.[lang], lang);
  return {
    contentLang,
    title: article.seo.title?.[contentLang] ?? article.title[contentLang],
    description: article.seo.description?.[contentLang] ?? article.summary[contentLang],
    image: override && isCmsFieldErrorMarker(image) ? cmsFieldErrorMarker(`article/${article.slug}.og_image`) : image,
  };
}

export function articleAlternates(article: Article, lang: Lang): NonNullable<Metadata["alternates"]> {
  const route = `/helpful-information/${article.slug}`;
  const canonicalLang = article.indexableLanguages.includes(lang) ? lang : "ja";
  return {
    canonical: localizeHref(route, canonicalLang),
    languages: {
      ...Object.fromEntries(article.indexableLanguages.map((locale) => [locale, localizeHref(route, locale)])),
      "x-default": localizeHref(route, "ja"),
    },
  };
}

export function buildArticleMetadata(article: Article, hub: PageMeta, brandName: string, lang: Lang): Metadata {
  const { title, description, image, contentLang } = articleSeoFields(article, hub, lang);
  const metadata = buildPageMetadataFields({
    route: `/helpful-information/${article.slug}`,
    lang,
    title,
    description,
    ogImage: isCmsFieldErrorMarker(image) ? "" : image,
    brandName,
  });
  metadata.alternates = articleAlternates(article, lang);
  metadata.robots = { index: article.indexableLanguages.includes(lang), follow: true };
  metadata.openGraph = {
    ...metadata.openGraph,
    type: "article",
    url: `${SITE_URL}${localizeHref(`/helpful-information/${article.slug}`, contentLang)}`,
    locale: contentLang === "ja" ? "ja_JP" : "en_US",
    alternateLocale: article.indexableLanguages.filter((locale) => locale !== contentLang).map((locale) => locale === "ja" ? "ja_JP" : "en_US"),
    ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}),
    ...(article.updatedAt ? { modifiedTime: article.updatedAt } : {}),
  };
  if (isCmsFieldErrorMarker(image)) {
    metadata.openGraph = { ...metadata.openGraph, images: [] };
    metadata.twitter = { card: "summary", images: [] };
  }
  return metadata;
}
