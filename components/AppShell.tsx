import Navbar from "./Navbar";
import Footer from "./Footer";
import StickyCta from "./StickyCta";
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
      <SiteCtaProvider primaryCta={site.cta.primary} primaryHref={site.cta.primaryHref}>
        <div aria-hidden="true" className="relative h-0">
          <div
            data-sticky-cta-sentinel
            className="pointer-events-none absolute left-0 top-0 w-px"
            style={{ height: 120 }}
          />
        </div>
        <main className="flex-1">{children}</main>
        <StickyCta lang={lang} />
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
