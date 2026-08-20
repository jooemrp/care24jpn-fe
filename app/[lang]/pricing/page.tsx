import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Section from "@/components/ui/Section";
import CourseRateCard from "@/components/ui/CourseRateCard";
import JsonLd from "@/components/JsonLd";
import { getPricingCopy, getCourseRates } from "@/features/cms/rates";
import { t, isLang } from "@/features/lang/i18n";

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
      canonical: lang === "ja" ? "/pricing" : `/${lang}/pricing`,
      languages: {
        ja: "/pricing",
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

  const [pricingCopy, courseRates] = await Promise.all([getPricingCopy(), getCourseRates()]);

  // PriceSpecification per rate row, built directly from the CMS-sourced
  // `courseRates` (features/cms/rates.ts) so the JSON-LD amounts can never
  // drift from the rates rendered by CourseRateCard below. Key order and
  // flatMap order match the original module-level constant exactly, so
  // JSON.stringify produces a byte-identical string.
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

  return (
    <>
      <JsonLd data={pricingJsonLd} />
      <Section heading={pricingCopy.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-lg leading-relaxed text-body">
          {t(pricingCopy.hero.body, lang)}
        </p>

        {/* The two standing terms (no joining fee, two-hour minimum) decide
            whether a visitor can use the service at all, so they are solid
            blocks — same flat language as the apply banners and the course
            headers. 20px rather than 18px because white on this fill is
            4.0:1, which only clears WCAG AA as large text (bold ≥18.66px). */}
        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {pricingCopy.highlights.map((highlight) => (
            <li
              key={highlight.en}
              className="rounded-xl bg-accent px-6 py-5 text-xl font-bold text-white"
            >
              {t(highlight, lang)}
            </li>
          ))}
        </ul>
      </Section>

      {/* Both courses side by side instead of behind tabs: choosing between
          caregiving and nursing is the whole job of this page, and a tab
          hides exactly the number the visitor wants to compare against. */}
      <Section surface lang={lang}>
        <div className="grid gap-6 lg:grid-cols-2">
          {courseRates.map((course) => (
            <CourseRateCard
              key={course.key}
              course={course}
              lang={lang}
              tone={course.key === "nursing" ? "accent" : "primary"}
            />
          ))}
        </div>
        <p className="mt-8 text-lg text-muted">{t(pricingCopy.note, lang)}</p>
      </Section>
    </>
  );
}
