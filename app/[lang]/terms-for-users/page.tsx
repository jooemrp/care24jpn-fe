import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalDocPage from "@/components/LegalDocPage";
import { legalDocs } from "@/constants/legal";
import { brand } from "@/constants/copy";
import { isLang } from "@/features/lang/i18n";

const doc = legalDocs.termsForUsers;

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
      canonical:
        lang === "ja" ? "/terms-for-users" : `/${lang}/terms-for-users`,
      languages: {
        ja: "/terms-for-users",
        en: "/en/terms-for-users",
      },
    },
  };
}

export default async function TermsForUsersPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <LegalDocPage doc={legalDocs.termsForUsers} lang={lang} />;
}
