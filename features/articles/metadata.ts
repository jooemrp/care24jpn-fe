import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug, getArticlesHubMeta } from "@/features/cms/articles";
import { getSite } from "@/features/cms/site";
import type { Lang } from "@/features/lang/i18n";
import { readArticleContent } from "./diagnostics";
import { buildArticleMetadata } from "./metadata-fields";

export async function articleMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const result = await readArticleContent(`article.${slug}`, () => Promise.all([
    getArticleBySlug(slug), getArticlesHubMeta(), getSite(),
  ]));
  if (!result.ok) return { title: result.diagnostic, description: result.diagnostic };
  const [article, meta, site] = result.data;
  if (!article) notFound();
  return buildArticleMetadata(article, meta, site.brand.name, lang);
}
