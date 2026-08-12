"use client";

import Link from "next/link";
import Image from "next/image";
import { brand, nav, footer } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";

function LangToggle() {
  const { lang, toggle } = useLangStore();
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium transition hover:border-primary hover:text-primary"
      aria-label={lang === "ja" ? "Switch to English" : "日本語に切り替える"}
    >
      <span className={lang === "en" ? "font-bold text-primary" : "text-muted"}>EN</span>
      <span className="text-border">/</span>
      <span className={lang === "ja" ? "font-bold text-primary" : "text-muted"}>JP</span>
    </button>
  );
}

export default function Footer() {
  const { lang } = useLangStore();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14 text-center">
        {/* Brand */}
        <Image
          src="/images/logo.png"
          alt={brand.logoAlt.en}
          width={320}
          height={120}
          className="mx-auto h-auto w-32"
        />
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-body">
          {t(footer.description, lang)}
        </p>

        {/* Primary menu — same pill style as the top navigation tabs */}
        <nav className="mt-8">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-full px-4 py-1.5 text-sm text-body transition hover:bg-primary-light hover:text-primary"
                >
                  {t(item.label, lang)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Legal / company links */}
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 border-t border-border/60 pt-7">
          {footer.legalLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-xs text-muted transition hover:text-primary"
              >
                {t(link.label, lang)}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <p className="text-xs text-muted">{footer.legal.ja}</p>
          <LangToggle />
        </div>
      </div>
    </footer>
  );
}
