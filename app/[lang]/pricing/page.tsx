import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Section from "@/components/ui/Section";
import TabPanel, { type Tab } from "@/components/ui/TabPanel";
import CourseRateTable from "@/components/ui/CourseRateTable";
import JsonLd from "@/components/JsonLd";
import { pricing as pricingCopy } from "@/constants/copy";
import { courseRates } from "@/constants/pricing";
import { t, isLang } from "@/features/lang/i18n";

// PriceSpecification per rate row, built directly from constants/pricing.ts
// (`courseRates`) so the JSON-LD amounts can never drift from the table
// rendered by CourseRateTable above.
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: pricingCopy.hero.heading.ja,
  itemListElement: courseRates.flatMap((course) =>
    course.rows.map((row) => ({
      "@type": "Offer",
      name: row.detail ? `${course.name.ja} ${row.label.ja}（${row.detail.ja}）` : `${course.name.ja} ${row.label.ja}`,
      priceCurrency: "JPY",
      price: row.price,
    })),
  ),
};

// Title/description are short JA strings; the root layout's title.template
// appends the brand name, so the brand must not be repeated here.
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return {
    title:
      lang === "ja"
        ? "ご利用者様向け料金"
        : "Pricing for users",
    description:
      lang === "ja"
        ? "介護コース1時間3,740円、看護コース1時間6,600円（税込・日中料金）。Care 24 Japanの在宅ケア料金をご案内します。"
        : "Caregiving course ¥3,740/hour, nursing course ¥6,600/hour (daytime, tax included). Care 24 Japan in-home care pricing.",
    alternates: {
      canonical: `/${lang}/pricing`,
      languages: {
        ja: "/ja/pricing",
        en: "/en/pricing",
      },
    },
  };
}

export default async function PricingPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const tabs: Tab[] = courseRates.map((course) => ({
    key: course.key,
    label: course.name,
    content: <CourseRateTable course={course} lang={lang} />,
  }));

  return (
    <>
      <JsonLd data={pricingJsonLd} />
      <Section heading={pricingCopy.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(pricingCopy.hero.body, lang)}
        </p>

        <ul className="mt-6 flex flex-wrap gap-3">
          {pricingCopy.highlights.map((highlight) => (
            <li
              key={highlight.en}
              className="rounded-full bg-accent-light px-4 py-2 text-sm font-medium text-accent"
            >
              {t(highlight, lang)}
            </li>
          ))}
        </ul>
      </Section>

      <Section surface lang={lang}>
        <TabPanel tabs={tabs} lang={lang} />
        <p className="mt-6 text-xs text-muted">
          {t(pricingCopy.note, lang)}
        </p>
      </Section>
    </>
  );
}
