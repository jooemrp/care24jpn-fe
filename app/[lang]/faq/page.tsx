import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CmsQueryBoundary from "@/components/query/CmsQueryBoundary";
import FaqView from "@/features/faq/components/faq-view";
import { getFaqContent } from "@/features/cms/faq";
import { isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";
import { queryKeys } from "@/lib/query-keys";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "faq", lang });
}

export default async function FaqPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <CmsQueryBoundary
      queryKey={queryKeys.faq}
      queryFn={() => getFaqContent()}
    >
      <FaqView lang={lang} />
    </CmsQueryBoundary>
  );
}
