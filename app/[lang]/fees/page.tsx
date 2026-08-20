import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Section from "@/components/ui/Section";
import { type Bilingual } from "@/constants/copy";
import { formatYen, type SupporterRates } from "@/constants/pricing";
import { getFeesCopy, getSupporterRates } from "@/features/cms/rates";
import { getSite } from "@/features/cms/site";
import { t, isLang, localizeHref, type Lang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

/**
 * Two-column rate table: what the customer pays vs. what the supporter earns.
 * The course name is the table's own caption, because both courses are shown
 * at once rather than switched between.
 */
function SupporterRateTable({
  course,
  columns,
  lang,
}: {
  course: SupporterRates;
  columns: { service: Bilingual; customer: Bilingual; supporter: Bilingual };
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
              <th className="py-4 pr-4 font-bold text-heading">{t(columns.service, lang)}</th>
              <th className="py-4 pr-4 text-right font-bold text-heading">
                {t(columns.customer, lang)}
              </th>
              <th className="py-4 text-right font-bold text-heading">
                {t(columns.supporter, lang)}
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
                  {formatYen(row.customer, lang)}
                </td>
                <td className="py-4 text-right font-bold tabular-nums text-primary">
                  {formatYen(row.supporter, lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

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

  const [feesCopy, supporterRates, site] = await Promise.all([
    getFeesCopy(),
    getSupporterRates(),
    getSite(),
  ]);

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
            <SupporterRateTable
              key={course.key}
              course={course}
              columns={feesCopy.columns}
              lang={lang}
            />
          ))}
        </div>
        <p className="mt-8 text-lg text-muted">{t(feesCopy.note, lang)}</p>

        {/* A care supporter who has read the rates needs somewhere to go. The
            client's registration URL is still pending, so `fees_meta.cta_href`
            (fallback `actionPlan.ctaHref`, constants/copy.ts) points at the
            home page's contact block — the same channel the recruitment banner
            used before it was pointed here. Editable from the dashboard the
            moment the real URL exists, no deploy required. */}
        <div className="mt-10 animate-fade-up">
          <Link
            href={localizeHref(feesCopy.ctaHref, lang)}
            className="inline-flex rounded-full bg-primary px-8 py-4 text-lg font-bold text-white transition hover:bg-primary-mid"
          >
            {t(site.cta.contact, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}
