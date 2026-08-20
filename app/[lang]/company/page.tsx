import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Section from "@/components/ui/Section";
import { getCompany } from "@/features/cms/pages";
import { t, isLang } from "@/features/lang/i18n";

// Title/description are short JA strings; the root layout's title.template
// appends the brand name, so the brand must not be repeated here.
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return {
    title: lang === "ja" ? "運営会社" : "Operating Company",
    description:
      lang === "ja"
        ? "Care 24 Japanを運営するメディカルインフォマティクス株式会社の会社概要（商号・所在地・設立・資本金など）をご案内します。"
        : "Company profile of MedicalInformatics Co.,Ltd., the operator of Care 24 Japan — trade name, head office, establishment, capital and more.",
    alternates: {
      canonical: lang === "ja" ? "/company" : `/${lang}/company`,
      languages: {
        ja: "/company",
        en: "/en/company",
      },
    },
  };
}

export default async function CompanyPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const company = await getCompany();

  return (
    <Section heading={company.heading} level="h1" lang={lang}>
      <dl className="max-w-3xl animate-fade-up">
        {company.rows.map((row) => (
          <div
            key={row.label.en}
            className="grid grid-cols-[6.5rem_1fr] gap-x-6 border-b border-border/60 py-5 first:border-t md:grid-cols-[9rem_1fr]"
          >
            <dt className="text-sm font-bold text-heading">{t(row.label, lang)}</dt>
            <dd className="whitespace-pre-line text-sm leading-relaxed text-body">
              {t(row.value, lang)}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
