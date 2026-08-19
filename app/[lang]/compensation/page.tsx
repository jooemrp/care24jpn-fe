import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalDocPage from "@/components/LegalDocPage";
import { legalDocs } from "@/constants/legal";
import { brand } from "@/constants/copy";
import { isLang } from "@/features/lang/i18n";

const doc = legalDocs.compensation;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

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
  return <LegalDocPage doc={legalDocs.compensation} lang={lang} />;
}
