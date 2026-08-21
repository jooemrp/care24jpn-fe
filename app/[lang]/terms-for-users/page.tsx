import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalDocPage from "@/components/LegalDocPage";
import { getLegalDoc } from "@/features/cms/legal";
import { getSite } from "@/features/cms/site";
import { isLang, t } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [doc, { brand }] = await Promise.all([
    getLegalDoc("legal-terms-for-users"),
    getSite(),
  ]);

  return pageMetadata({
    key: "terms-for-users",
    lang,
    legal: { heading: doc.heading, brandName: brand.name },
  });
}

export default async function TermsForUsersPage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [doc, site] = await Promise.all([getLegalDoc("legal-terms-for-users"), getSite()]);
  return <LegalDocPage doc={doc} lang={lang} tocLabel={t(site.ui.tocLabel, lang)} />;
}
