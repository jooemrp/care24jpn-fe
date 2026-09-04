import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CmsQueryBoundary from "@/components/query/CmsQueryBoundary";
import CompanyView from "@/features/company/components/company-view";
import { getCompanyContent } from "@/features/cms/pages";
import { isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";
import { queryKeys } from "@/lib/query-keys";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "company", lang });
}

export default async function CompanyPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <CmsQueryBoundary
      queryKey={queryKeys.company}
      queryFn={() => getCompanyContent()}
    >
      <CompanyView lang={lang} />
    </CmsQueryBoundary>
  );
}
