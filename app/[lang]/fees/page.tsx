import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Section from "@/components/ui/Section";
import { actionPlan as feesCopy } from "@/constants/copy";
import {
  supporterRates,
  formatYen,
  type SupporterRates,
} from "@/constants/pricing";
import { t, isLang, type Lang } from "@/features/lang/i18n";

/**
 * Two-column rate table: what the customer pays vs. what the supporter earns.
 * The course name is the table's own caption, because both courses are shown
 * at once rather than switched between.
 */
function SupporterRateTable({
  course,
  lang,
}: {
  course: SupporterRates;
  lang: Lang;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <h2 className="bg-primary-light px-7 py-5 text-xl font-bold text-heading">
        {t(course.name, lang)}
      </h2>
      <div className="overflow-x-auto px-7 pb-6">
        <table className="w-full text-lg">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-4 pr-4 font-bold text-heading" />
              <th className="py-4 pr-4 text-right font-bold text-heading">
                {t(feesCopy.columns.customer, lang)}
              </th>
              <th className="py-4 text-right font-bold text-heading">
                {t(feesCopy.columns.supporter, lang)}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {course.rows.map((row) => (
              <tr key={row.key}>
                <td className="py-4 pr-4">
                  <span className="font-medium text-heading">{t(row.label, lang)}</span>
                  {row.detail && (
                    <span className="mt-0.5 block text-lg text-muted">
                      {t(row.detail, lang)}
                    </span>
                  )}
                </td>
                <td className="py-4 pr-4 text-right tabular-nums text-body">
                  {formatYen(row.customer)}
                </td>
                <td className="py-4 text-right font-bold tabular-nums text-primary">
                  {formatYen(row.supporter)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// SEO title recommended by the client sheet for the /fees URL. The brand
// suffix is appended once by the root layout's title.template, so it must
// not be repeated here.
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return {
    title:
      lang === "ja"
        ? "ケアサポーターの時給・報酬体系一覧"
        : "Hourly wage/salary system for care supporters",
    description:
      lang === "ja"
        ? "Care24Japan ケアサポーターの時給・給与体系。介護コース・看護コースの1時間単価（税込）をご案内します。"
        : "Care 24 Japan care-supporter hourly wage and salary system. Hourly rates (tax included) for the caregiving and nursing courses.",
    alternates: {
      canonical: `/${lang}/fees`,
      languages: {
        ja: "/ja/fees",
        en: "/en/fees",
      },
    },
  };
}

export default async function FeesPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <>
      <Section heading={feesCopy.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-lg leading-relaxed text-body">
          {t(feesCopy.hero.body, lang)}
        </p>
      </Section>

      {/* Both courses stacked, not tabbed — a supporter comparing caregiving
          against nursing pay shouldn't have to click between them. */}
      <Section surface lang={lang}>
        <div className="flex flex-col gap-6">
          {supporterRates.map((course) => (
            <SupporterRateTable key={course.key} course={course} lang={lang} />
          ))}
        </div>
        <p className="mt-8 text-lg text-muted">{t(feesCopy.note, lang)}</p>
      </Section>
    </>
  );
}
