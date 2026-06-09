"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { brand, nav, cta } from "@/constants/copy";
import { useLang, t } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium transition hover:border-primary hover:text-primary"
      aria-label={lang === "ja" ? "Switch to English" : "日本語に切り替える"}
    >
      <span className={lang === "en" ? "font-bold text-primary" : "text-muted"}>
        EN
      </span>
      <span className="text-border">/</span>
      <span className={lang === "ja" ? "font-bold text-primary" : "text-muted"}>
        JP
      </span>
    </button>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { lang } = useLang();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-24 border-b border-border bg-surface/20 backdrop-blur-md">
      <nav className="h-full max-w-5xl mx-auto px-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center shrink-0"
          aria-label={brand.logoAlt.en}
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/logo.png"
            alt={brand.logoAlt.en}
            width={427}
            height={160}
            priority
            className="h-auto w-36"
          />
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-7">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm transition hover:text-primary ${
                    active ? "text-primary" : "text-body"
                  }`}
                >
                  {t(item.label, lang)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <LangToggle />
          <Link
            href="/pricing"
            className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-medium transition hover:bg-primary-mid"
          >
            {t(cta.secondary, lang)}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-xs text-muted hover:text-accent transition"
          >
            {lang === "ja" ? "ログアウト" : "Sign out"}
          </button>
        </div>

        {/* Mobile: lang toggle + hamburger */}
        <div className="md:hidden flex items-center gap-3">
          <LangToggle />
          <button
            type="button"
            className="inline-flex flex-col gap-1.5 p-2"
            aria-label="メニュー"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block h-0.5 w-6 bg-heading" />
            <span className="block h-0.5 w-6 bg-heading" />
            <span className="block h-0.5 w-6 bg-heading" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-surface">
          <ul className="max-w-5xl mx-auto px-6 py-4 flex flex-col gap-4">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`block text-sm ${
                      active ? "text-primary" : "text-body"
                    }`}
                  >
                    {t(item.label, lang)}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="inline-flex bg-primary text-white px-6 py-2.5 rounded-full text-sm font-medium transition hover:bg-primary-mid"
              >
                {t(cta.secondary, lang)}
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-muted hover:text-accent transition"
              >
                {lang === "ja" ? "ログアウト" : "Sign out"}
              </button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
