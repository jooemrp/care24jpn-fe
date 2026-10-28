import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsContractNotice } from "@/components/cms/CmsContractNotice";
import { readArticleContent } from "@/features/articles/diagnostics";
import ArticleView from "@/features/articles/components/article-view";
import { articleMetadata } from "@/features/articles/metadata";
import { getArticleBySlug } from "@/features/cms/articles";
import { isLang } from "@/features/lang/i18n";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/helpful-information/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();

  return articleMetadata(slug, lang);
}

export default async function ArticlePage({ params }: PageProps<"/[lang]/helpful-information/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();

  const result = await readArticleContent(`article.${slug}`, () => getArticleBySlug(slug));
  if (!result.ok) return <CmsContractNotice details={result.diagnostic} />;
  const article = result.data;
  if (!article) notFound();

  return <ArticleView article={article} lang={lang} />;
}
