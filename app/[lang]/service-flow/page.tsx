import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Section from "@/components/ui/Section";
import StepFlow from "@/components/ui/StepFlow";
import { serviceFlow, cta } from "@/constants/copy";
import { t, localizeHref, isLang } from "@/features/lang/i18n";

// Title/description are short JA strings; the root layout's title.template
// appends the brand name, so the brand must not be repeated here.
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return {
    title: lang === "ja" ? "ご利用の流れ" : "How it works",
    description:
      lang === "ja"
        ? "ご登録からサービス終了まで、4つのステップでご利用いただけます。Care 24 Japanのサービス利用の流れをご案内します。"
        : "From registration to completion, in four simple steps. How to use Care 24 Japan's services.",
    alternates: {
      canonical: `/${lang}/service-flow`,
      languages: {
        ja: "/ja/service-flow",
        en: "/en/service-flow",
      },
    },
  };
}

export default async function ServiceFlowPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <>
      <Section heading={serviceFlow.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(serviceFlow.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <StepFlow steps={serviceFlow.steps} lang={lang} />
        <div className="mt-12 animate-fade-up">
          <Link
            href={localizeHref("/pricing", lang)}
            className="inline-flex bg-primary text-white px-8 py-3 rounded-full font-medium transition hover:bg-primary-mid"
          >
            {t(cta.primary, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}
