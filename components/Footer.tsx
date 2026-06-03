"use client";

import Link from "next/link";
import Image from "next/image";
import { brand, footer } from "@/constants/copy";
import { useLang, t } from "@/context/LanguageContext";

function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium transition hover:border-primary hover:text-primary"
      aria-label={lang === "jp" ? "Switch to English" : "日本語に切り替える"}
    >
      <span className={lang === "en" ? "font-bold text-primary" : "text-muted"}>EN</span>
      <span className="text-border">/</span>
      <span className={lang === "jp" ? "font-bold text-primary" : "text-muted"}>JP</span>
    </button>
  );
}

export default function Footer() {
  const { lang } = useLang();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-3">
        {/* Brand + description */}
        <div className="space-y-4">
          <Image
            src="/images/logo.png"
            alt={brand.logoAlt.en}
            width={320}
            height={120}
            className="h-auto w-30"
          />
          <p className="text-sm leading-relaxed text-body">
            {t(footer.description, lang)}
          </p>
          <LangToggle />
        </div>

        {/* Link columns */}
        {footer.columns.map((col) => (
          <div key={col.title.en} className="space-y-4">
            <h4 className="text-sm font-bold text-heading">
              {t(col.title, lang)}
            </h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-body transition hover:text-primary"
                  >
                    {t(link.label, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Contact */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-heading">
            {t(footer.contact.title, lang)}
          </h4>
          <dl className="space-y-3 text-sm text-body">
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted">
                {t(footer.contact.phoneLabel, lang)}
              </dt>
              <dd>
                <a href={`tel:${footer.contact.phone}`} className="hover:text-primary">
                  {footer.contact.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted">
                {t(footer.contact.hoursLabel, lang)}
              </dt>
              <dd>{t(footer.contact.hours, lang)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted">
                {t(footer.contact.addressLabel, lang)}
              </dt>
              <dd>{t(footer.contact.address, lang)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="max-w-5xl mx-auto px-6 py-6 text-xs text-muted">
          {footer.legal.jp}
        </p>
      </div>
    </footer>
  );
}
