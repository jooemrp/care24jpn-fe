import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readArticleContent } from "@/features/articles/diagnostics";
import ArticlesView from "@/features/articles/components/articles-view";
import { isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/helpful-information">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const result = await readArticleContent("articles.seo", () => pageMetadata({ key: "articles", lang }));
  return result.ok ? result.data : { title: result.diagnostic, description: result.diagnostic };
}

export default async function ArticlesPage({
  params,
  searchParams,
}: PageProps<"/[lang]/helpful-information">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const { category } = await searchParams;
  return (
    <ArticlesView lang={lang} initialCategory={typeof category === "string" ? category : null} />
  );
}
