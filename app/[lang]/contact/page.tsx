import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContactForm from "@/components/contact/ContactForm";
import Section from "@/components/ui/Section";
import { contactPage } from "@/constants/contact";
import { t, isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return pageMetadata({ key: "contact", lang });
}

export default async function ContactPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <>
      <Section heading={contactPage.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(contactPage.requiredNote, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <ContactForm lang={lang} />
      </Section>
    </>
  );
}
