import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CmsQueryBoundary from "@/components/query/CmsQueryBoundary";
import ServiceFlowView from "@/features/service-flow/components/service-flow-view";
import { getServiceFlowContent } from "@/features/cms/pages";
import { isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";
import { queryKeys } from "@/lib/query-keys";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "service-flow", lang });
}

export default async function ServiceFlowPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <CmsQueryBoundary
      queryKey={queryKeys.serviceFlow}
      queryFn={() => getServiceFlowContent()}
    >
      <ServiceFlowView lang={lang} />
    </CmsQueryBoundary>
  );
}
