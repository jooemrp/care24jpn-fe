import Navbar from "./Navbar";
import Footer from "./Footer";
import { SiteCtaProvider } from "./site-cta-provider";
import type { ReactNode } from "react";
import type { Lang } from "@/features/lang/i18n";
import type { SiteContent } from "@/features/cms/site";
import type { HomeContent } from "@/features/home/types";

/**
 * Server Component. Route layout owns the request-time CMS reads and passes
 * the resolved chrome values here. This component only composes the shared
 * server/client shell, so it stays synchronous and cannot duplicate those
 * reads.
 */
export default function AppShell({
  children,
  lang,
  site,
  tokushohoHeading,
  homeContact,
}: {
  children: ReactNode;
  lang: Lang;
  site: SiteContent;
  tokushohoHeading: SiteContent["brand"]["logoAlt"];
  homeContact: Pick<HomeContent["contact"], "isms" | "isoLogo" | "isoLogoAlt">;
}) {
  return (
    <>
      <Navbar lang={lang} site={site} />
      <SiteCtaProvider primaryCta={site.cta.primary}>
        <main className="flex-1">{children}</main>
      </SiteCtaProvider>
      <Footer
        lang={lang}
        site={site}
        tokushohoHeading={tokushohoHeading}
        homeContact={homeContact}
      />
    </>
  );
}
