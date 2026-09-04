import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CmsQueryBoundary from "@/components/query/CmsQueryBoundary";
import ContactView from "@/features/contact/components/contact-view";
import { getContactContent } from "@/features/cms/contact";
import { isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";
import { queryKeys } from "@/lib/query-keys";

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
    <CmsQueryBoundary
      queryKey={queryKeys.contact.content}
      queryFn={() => getContactContent()}
    >
      <ContactView lang={lang} />
    </CmsQueryBoundary>
  );
}
