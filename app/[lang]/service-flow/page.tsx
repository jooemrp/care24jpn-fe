import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Section from "@/components/ui/Section";
import StepFlow from "@/components/ui/StepFlow";
import { getServiceFlow } from "@/features/cms/pages";
import { getSite } from "@/features/cms/site";
import { t, localizeHref, isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

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
  const [serviceFlow, site] = await Promise.all([getServiceFlow(), getSite()]);

  return (
    <>
      <Section heading={serviceFlow.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-lg leading-relaxed text-body">
          {t(serviceFlow.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <StepFlow steps={serviceFlow.steps} lang={lang} />
        <div className="mt-12 animate-fade-up">
          <Link
            href={localizeHref(serviceFlow.hero.ctaHref, lang)}
            className="inline-flex rounded-full bg-primary px-8 py-4 text-lg font-bold text-white transition hover:bg-primary-mid"
          >
            {t(site.cta.primary, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}
