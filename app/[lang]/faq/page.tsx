import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Section from "@/components/ui/Section";
import FaqList from "@/components/faq/FaqList";
import { getFaq } from "@/features/cms/faq";
import { t, isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

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

  // CMS-sourced — the FAQ page data comes from Atlas (no constants). When
  // the page data is unavailable, getFaq() throws and this route surfaces
  // an error rather than stale copy.
  const faq = await getFaq();

  return (
    <>
      <Section heading={faq.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(faq.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <FaqList lang={lang} categories={faq.categories} items={faq.items} />
      </Section>
    </>
  );
}