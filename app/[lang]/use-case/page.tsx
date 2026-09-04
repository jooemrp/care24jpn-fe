import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CmsQueryBoundary from "@/components/query/CmsQueryBoundary";
import UseCaseView from "@/features/use-case/components/use-case-view";
import { getUseCaseContent } from "@/features/cms/pages";
import { isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";
import { queryKeys } from "@/lib/query-keys";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "use-case", lang });
}

export default async function UseCasePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <CmsQueryBoundary
      queryKey={queryKeys.useCase}
      queryFn={() => getUseCaseContent()}
    >
      <UseCaseView lang={lang} />
    </CmsQueryBoundary>
  );
}
