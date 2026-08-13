import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Section from "@/components/ui/Section";
import TabPanel, { type Tab } from "@/components/ui/TabPanel";
import { actionPlan as feesCopy } from "@/constants/copy";
import {
  supporterRates,
  formatYen,
  type SupporterRates,
} from "@/constants/pricing";
import { t, isLang, type Lang } from "@/features/lang/i18n";

/** Two-column rate table: what the customer pays vs. what the supporter earns. */
function SupporterRateTable({
  course,
  lang,
}: {
  course: SupporterRates;
  lang: Lang;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-3 pr-4 font-bold text-heading" />
            <th className="py-3 pr-4 text-right font-bold text-heading">
              {t(feesCopy.columns.customer, lang)}
            </th>
            <th className="py-3 text-right font-bold text-heading">
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
                  <span className="mt-0.5 block text-xs text-muted">
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

  const tabs: Tab[] = supporterRates.map((course) => ({
    key: course.key,
    label: course.name,
    content: <SupporterRateTable course={course} lang={lang} />,
  }));

  return (
    <>
      <Section heading={feesCopy.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(feesCopy.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <TabPanel tabs={tabs} lang={lang} />
        <p className="mt-6 text-xs text-muted">{t(feesCopy.note, lang)}</p>
      </Section>
    </>
  );
}
