import Navbar from "./Navbar";
import Footer from "./Footer";
import type { ReactNode } from "react";
import type { Lang } from "@/features/lang/i18n";
import { getSite } from "@/features/cms/site";
import { getLegalHeading } from "@/features/cms/legal";

/**
 * Server Component. Fetches the site chrome once (`getSite()` is
 * `cache()`-ed, so this and `generateMetadata` in app/[lang]/layout.tsx
 * dedup to a single fetch per request) and prop-drills it down: `Navbar` is
 * a Client Component and can't `await`, so it must receive `site` as a
 * prop rather than fetching it itself.
 *
 * The tokushoho heading is fetched here, next to `getSite()`, rather than
 * inside `Footer`. Two reasons:
 * - `Promise.all` issues both reads in the same tick instead of waiting for
 *   the site chrome to land before even asking for the heading.
 * - it keeps `Footer` synchronous — it renders one string out of this, and a
 *   component that only needs a string shouldn't own a network read.
 * Unconditional on purpose, exactly as `Footer` used to be: whether any
 * `footer-legal-link` actually sets `use_legal_heading` is only knowable
 * after `site` resolves, and waiting to find out would re-serialize the two
 * reads for no gain.
 */
export default async function AppShell({
  children,
  lang,
}: {
  children: ReactNode;
  lang: Lang;
}) {
  const [site, tokushohoHeading] = await Promise.all([
    getSite(),
    getLegalHeading("legal-tokushoho"),
  ]);

  return (
    <>
      <Navbar lang={lang} site={site} />
      <main className="flex-1">{children}</main>
      <Footer lang={lang} site={site} tokushohoHeading={tokushohoHeading} />
    </>
  );
}
