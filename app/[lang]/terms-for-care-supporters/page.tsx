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
    getLegalDoc("legal-terms-for-care-supporters"),
    getSite(),
  ]);

  return {
    title: doc.heading[lang],
    description:
      lang === "ja"
        ? `${doc.heading.ja} | ${doc.heading.en} — ${brand.name}`
        : `${doc.heading.en} — ${brand.name}`,
    alternates: {
      canonical:
        lang === "ja"
          ? "/terms-for-care-supporters"
          : `/${lang}/terms-for-care-supporters`,
      languages: {
        ja: "/terms-for-care-supporters",
        en: "/en/terms-for-care-supporters",
      },
    },
  };
}

export default async function TermsForCareSupportersPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const doc = await getLegalDoc("legal-terms-for-care-supporters");
  return <LegalDocPage doc={doc} lang={lang} />;
}
