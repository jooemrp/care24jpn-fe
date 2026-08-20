import Navbar from "./Navbar";
import Footer from "./Footer";
import type { ReactNode } from "react";
import type { Lang } from "@/features/lang/i18n";
import { getSite } from "@/features/cms/site";

/**
 * Server Component. Fetches the site chrome once (`getSite()` is
 * `cache()`-ed, so this and `generateMetadata` in app/[lang]/layout.tsx
 * dedup to a single fetch per request) and prop-drills it down: `Navbar` is
 * a Client Component and can't `await`, so it must receive `site` as a
 * prop rather than fetching it itself.
 */
export default async function AppShell({
  children,
  lang,
}: {
  children: ReactNode;
  lang: Lang;
}) {
  const site = await getSite();

  return (
    <>
      <Navbar lang={lang} site={site} />
      <main className="flex-1">{children}</main>
      <Footer lang={lang} site={site} />
    </>
  );
}
