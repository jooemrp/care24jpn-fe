import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Section from "@/components/ui/Section";
import FaqList from "@/components/faq/FaqList";
import { t, isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

const faqHeroHeading = {
  ja: "よくあるご質問",
  en: "FAQ",
};

const faqHeroBody = {
  ja: "Care24Japanのサービスについてよくいただくご質問をまとめました。",
  en: "Find answers to the most common questions about Care24Japan's services.",
};

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "faq", lang });
}

export default async function FaqPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <>
      <Section heading={faqHeroHeading} level="h1" lang={lang}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(faqHeroBody, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <FaqList lang={lang} />
      </Section>
    </>
  );
}
