import Link from "next/link";
import Image from "next/image";
import { t, localizeHref, type Lang } from "@/features/lang/i18n";
import type { SiteContent } from "@/features/cms/site";
import { getLegalDoc } from "@/features/cms/legal";
import LangToggle from "./LangToggle";

export default async function Footer({ lang, site }: { lang: Lang; site: SiteContent }) {
  // Only used to resolve the tokushoho footer link's label — the tokushoho
  // union member in site.footer.legalLinks carries `key: "tokushoho"`
  // instead of its own `label`, same as constants/copy.ts#footer.legalLinks.
  const tokushoho = await getLegalDoc("legal-tokushoho");

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Brand */}
        <Image
          src="/images/logo.png"
          alt={t(site.brand.logoAlt, lang)}
          width={320}
          height={120}
          className="h-auto w-32"
        />
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-body">
          {t(site.footer.description, lang)}
        </p>

        {/* Primary menu — same pill style as the top navigation tabs */}
        <nav className="mt-8">
          {/* -ml-4 cancels the first pill's padding so its text lines up with the logo */}
          <ul className="-ml-4 flex flex-wrap items-center gap-2">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={localizeHref(item.href, lang)}
                  className="block rounded-full px-4 py-1.5 text-sm text-body transition hover:bg-primary-light hover:text-primary"
                >
                  {t(item.label, lang)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Legal / company links */}
        <ul className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-border/60 pt-7">
          {site.footer.legalLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={localizeHref(link.href, lang)}
                className="text-xs text-muted transition hover:text-primary"
              >
                {t("key" in link ? tokushoho.heading : link.label, lang)}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <p className="text-xs text-muted">{t(site.footer.legal, lang)}</p>
          <LangToggle lang={lang} />
        </div>
      </div>
    </footer>
  );
}
