import "server-only";

import { cache } from "react";
import { unwrap } from "@/lib/api";
import { getPublicEntries } from "@/lib/bff";
import { getPageBlocksStrict, getPageMetaStrict } from "./client";
import {
  findArticleEntry, orderedArticleEntries, mapArticle, mapArticlesHub,
  type Article, type ArticlesHub,
} from "./articles-map";
import type { PageMeta, RawEntry } from "./types";

/** The static hub owns hero, UI labels and social media; entries own articles. */
export const getArticlesHub = cache(async (): Promise<ArticlesHub> =>
  mapArticlesHub(unwrap(await getPageBlocksStrict("articles"))),
);

export const getArticlesHubMeta = cache(async (): Promise<PageMeta> =>
  unwrap(await getPageMetaStrict("articles")),
);

/** Never use the untyped /entries/:slug endpoint: slugs are type-scoped. */
export const getPublishedArticleEntries = cache(async (lang: "ja" | "en" = "ja"): Promise<RawEntry[]> =>
  orderedArticleEntries(unwrap(await getPublicEntries("article", lang))),
);

export type ArticleEntry =
  | { ok: true; article: Article }
  | { ok: false; pageSlug: string; message: string };

/** A broken entry's structure is isolated to its diagnostic card. Individual
 * malformed fields are handled in mapArticle so unrelated content stays usable. */
export const getArticleEntries = cache(async (): Promise<ArticleEntry[]> => {
  const [japanese, english] = await Promise.all([getPublishedArticleEntries("ja"), getPublishedArticleEntries("en")]);
  const englishBySlug = new Map(english.map((entry) => [entry.slug, entry]));
  return japanese.map((entry): ArticleEntry => {
    try {
      return { ok: true, article: mapArticle(entry, englishBySlug.get(entry.slug)) };
    } catch (error) {
      console.error(`[articles] "${entry.slug}" could not be read:`, error);
      return { ok: false, pageSlug: entry.slug, message: error instanceof Error ? error.message : "Unknown error" };
    }
  });
});

export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  const [japanese, english] = await Promise.all([getPublishedArticleEntries("ja"), getPublishedArticleEntries("en")]);
  const entry = findArticleEntry(japanese, slug);
  return entry ? mapArticle(entry, findArticleEntry(english, slug) ?? undefined) : null;
});

/** View metadata adapter; optional entry SEO falls back to content/hub values. */
export const getArticlePageMeta = cache(async (slug: string): Promise<PageMeta> => {
  const article = await getArticleBySlug(slug);
  if (!article) throw new Error(`Published article entry "${slug}" was not found in type article.`);
  const hub = await getArticlesHubMeta();
  return { title: article.title, description: article.summary, ogImage: hub.ogImage, updatedAt: article.updatedAt };
});
