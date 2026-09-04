import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CmsQueryBoundary from "@/components/query/CmsQueryBoundary";
import JsonLd from "@/components/JsonLd";
import { queryKeys } from "@/lib/query-keys";
import { getRatesForRender } from "@/features/cms/rates";
import RatesView from "@/features/rates/components/RatesView";
import { isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";
import { buildPricingJsonLd } from "@/features/seo/pricingJsonLd";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "pricing", lang });
}

export default async function PricingPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  /**
   * Keep the strict CMS snapshot server-first. The same resolved snapshot is
   * used for JSON-LD and for the query boundary, so crawlers and the hydrated
   * client cannot observe different customer rates on the initial request.
   */
  const rates = await getRatesForRender();
  const pricingJsonLd = buildPricingJsonLd({
    heading: rates.pricing.hero.heading,
    courses: rates.courseRates,
    lang,
  });

  return (
    <>
      <JsonLd data={pricingJsonLd} />
      <CmsQueryBoundary
        queryKey={queryKeys.rates}
        queryFn={() => Promise.resolve(rates)}
      >
        <RatesView lang={lang} mode="pricing" />
      </CmsQueryBoundary>
    </>
  );
}
