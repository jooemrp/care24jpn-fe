import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CmsQueryBoundary from "@/components/query/CmsQueryBoundary";
import { queryKeys } from "@/lib/query-keys";
import { getHome } from "@/features/cms/home";
import { getSite } from "@/features/cms/site";
import HomeView from "@/features/home/components/HomeView";
import { isLang } from "@/features/lang/i18n";
import { pageMetadata } from "@/features/seo/pageMetadata";

// Keep the homepage metadata contract unchanged while moving its body into
// client-owned feature components.
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const meta = await pageMetadata({ key: "home", lang });
  return { ...meta, title: { absolute: meta.title as string } };
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  // The strict loader resolves the exact snapshot that the hydration boundary
  // seeds into the single home query; Atlas failures remain visible as CMS
  // errors instead of being replaced with bundled content.
  const [home, site] = await Promise.all([getHome(), getSite()]);

  return (
    <CmsQueryBoundary
      queryKey={queryKeys.home}
      queryFn={() => Promise.resolve(home)}
    >
      <HomeView lang={lang} contactCta={site.cta.contact} />
    </CmsQueryBoundary>
  );
}
