import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CmsQueryBoundary from "@/components/query/CmsQueryBoundary";
import { queryKeys } from "@/lib/query-keys";
import { getRatesForRender } from "@/features/cms/rates";
import { getSite } from "@/features/cms/site";
import RatesView from "@/features/rates/components/RatesView";
import { isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "fees", lang });
}

export default async function FeesPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const [rates, site] = await Promise.all([getRatesForRender(), getSite()]);

  return (
    <CmsQueryBoundary
      queryKey={queryKeys.rates}
      queryFn={() => Promise.resolve(rates)}
    >
      <RatesView
        lang={lang}
        mode="fees"
        contactCta={site.cta.contact}
      />
    </CmsQueryBoundary>
  );
}
