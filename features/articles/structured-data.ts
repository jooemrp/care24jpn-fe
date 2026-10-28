import { SITE_URL } from "@/constants/site";
import type { Article, ArticlesHub } from "../cms/articles-map";
import { isCmsFieldErrorMarker } from "../cms/fields";
import type { PageMeta } from "../cms/types";
import { localizeHref, type Lang } from "../lang/i18n";
import { articleSeoFields } from "./metadata-fields";

export function buildArticleJsonLd(article: Article, hub: PageMeta, brandName: string, lang: Lang) {
  const { title, description, image, contentLang } = articleSeoFields(article, hub, lang);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: contentLang,
    ...(!isCmsFieldErrorMarker(image) ? { image } : {}),
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    mainEntityOfPage: `${SITE_URL}${localizeHref(`/helpful-information/${article.slug}`, contentLang)}`,
    author: { "@type": "Organization", name: brandName },
    publisher: { "@type": "Organization", name: brandName },
  };
}

export function buildArticlesHubJsonLd(hub: ArticlesHub, articles: Article[], lang: Lang) {
  const url = `${SITE_URL}${localizeHref("/helpful-information", lang)}`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: hub.labels.breadcrumb_home[lang], item: `${SITE_URL}${localizeHref("/", lang)}` },
      { "@type": "ListItem", position: 2, name: hub.hero.heading[lang], item: url },
    ],
  };
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    url,
    name: hub.hero.heading[lang],
    description: hub.hero.body[lang],
    inLanguage: lang,
    breadcrumb: { "@id": breadcrumb["@id"] },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: articles.length,
      itemListElement: articles.map((article, index) => {
        const contentLang = article.indexableLanguages.includes(lang) ? lang : "ja";
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Article",
            name: article.title[contentLang],
            url: `${SITE_URL}${localizeHref(`/helpful-information/${article.slug}`, contentLang)}`,
            inLanguage: contentLang,
          },
        };
      }),
    },
  };
  return [collection, breadcrumb] as const;
}
