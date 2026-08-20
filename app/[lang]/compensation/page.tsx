import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalDocPage from "@/components/LegalDocPage";
import { getLegalDoc } from "@/features/cms/legal";
import { getSite } from "@/features/cms/site";
import { isLang } from "@/features/lang/i18n";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [doc, { brand }] = await Promise.all([
    getLegalDoc("legal-compensation"),
    getSite(),
  ]);

  return {
    title: doc.heading[lang],
    description:
      lang === "ja"
        ? `${doc.heading.ja} | ${doc.heading.en} — ${brand.name}`
        : `${doc.heading.en} — ${brand.name}`,
    alternates: {
      canonical: lang === "ja" ? "/compensation" : `/${lang}/compensation`,
      languages: {
        ja: "/compensation",
        en: "/en/compensation",
      },
    },
  };
}

export default async function CompensationPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const doc = await getLegalDoc("legal-compensation");
  return <LegalDocPage doc={doc} lang={lang} />;
}
