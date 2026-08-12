"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { brand, nav, cta, contactPhone } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";
import type { Lang } from "@/features/lang/store";

/** Scroll distance (px) after which the header condenses. */
const CONDENSE_AT = 72;

/**
 * Space the header reserves in the document flow, at rest and condensed alike.
 * 81px = 80px tier 1 + 1px bottom border (below `md`, where tier 2 is hidden);
 * 130px adds tier 2's 48px row and its 1px divider.
 */
const SHELL_HEIGHT = "h-[81px] md:h-[130px]";

/** Shared motion for every part of the header chrome. */
const MOTION =
  "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out";

/**
 * Invisible 44px-tall hit area centred on the control, so small pills keep a
 * comfortable touch target without growing visually.
 */
const HIT_AREA =
  "relative before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']";

/**
 * Watches a zero-cost sentinel sitting at the very top of the document.
 *
 * An IntersectionObserver only wakes up when the sentinel crosses the viewport
 * edge, so scrolling itself costs nothing: no scroll listener, no rAF loop, and
 * exactly one setState per crossing (not per frame).
 */
function useCondensedOnScroll() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, condensed };
}

function LangToggle() {
  const { lang, toggle } = useLangStore();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium transition hover:border-primary hover:text-primary ${HIT_AREA}`}
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

/**
 * Phone number on top, supporting note beneath.
 *
 * The block has a fixed width and the note stays on one line in both
 * languages, so the number keeps the same position — and the same optical
 * centre against the CTA — whether the site is in JA or EN. That fixed width
 * is kept in the condensed state too; only the note collapses, the number
 * itself never shrinks (this is the primary conversion path for the site).
 */
function PhoneBlock({
  lang,
  align = "end",
  condensed = false,
}: {
  lang: Lang;
  align?: "start" | "end";
  condensed?: boolean;
}) {
  return (
    <a
      href={`tel:${contactPhone.tel}`}
      aria-label={`${t(contactPhone.note, lang)} ${contactPhone.display}`}
      className={`group flex min-h-11 w-72 flex-col justify-center leading-tight ${MOTION} ${
        condensed ? "pt-0" : "pt-1"
      } ${align === "end" ? "items-end text-right" : "items-start text-left"}`}
    >
      <span className="text-2xl font-bold tabular-nums tracking-[0.08em] text-heading transition group-hover:text-primary">
        {contactPhone.display}
      </span>
      {/* The clip box carries its own 4px padding so the note's glyphs — whose
          ink box is taller than its `leading-none` line box — are never shaved
          while the height animates. */}
      <span
        className={`block overflow-hidden ${MOTION} ${
          condensed ? "max-h-0 py-0 opacity-0" : "max-h-5 py-1 opacity-100"
        }`}
      >
        <span className="block whitespace-nowrap text-xs leading-none text-body">
          {t(contactPhone.note, lang)}
        </span>
      </span>
    </a>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { lang } = useLangStore();
  const [open, setOpen] = useState(false);
  const { sentinelRef, condensed } = useCondensedOnScroll();

  return (
    <>
      {/* Scroll sentinel — zero-height wrapper so it never affects layout; the
          inner box spans the first CONDENSE_AT pixels of the document and is
          hidden behind the sticky header. */}
      <div aria-hidden="true" className="relative h-0">
        <div
          ref={sentinelRef}
          className="pointer-events-none absolute left-0 top-0 w-px"
          style={{ height: CONDENSE_AT }}
        />
      </div>

      {/*
        The <header> is only a shell: `sticky` keeps an element in normal flow,
        so if the visible bar shrank the header's own box the whole page would
        jump up by the difference. The shell therefore keeps a fixed footprint
        (SHELL_HEIGHT) and only the bar inside it condenses — content below
        never moves. The shell's spare strip is click-through.
      */}
      <header
        className={`pointer-events-none sticky top-0 z-50 shrink-0 ${SHELL_HEIGHT}`}
      >
        <div
          className={`pointer-events-auto border-b border-border backdrop-blur-md ${MOTION} ${
            condensed
              ? "bg-surface/85 shadow-[0_2px_12px_rgba(27,31,94,0.07)]"
              : "bg-surface/70 shadow-none"
          }`}
        >
        {/* Tier 1 — brand, contact, actions */}
        <div
          className={`max-w-6xl mx-auto px-6 flex items-center justify-between gap-6 ${MOTION} ${
            condensed ? "h-14" : "h-20"
          }`}
        >
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
              className={`h-auto w-36 origin-left ${MOTION} ${
                condensed ? "scale-[0.78]" : "scale-100"
              }`}
            />
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <PhoneBlock lang={lang} condensed={condensed} />
            <LangToggle />
            <Link
              href="/pricing"
              className="inline-flex min-h-11 min-w-36 items-center justify-center bg-primary text-white px-6 py-2.5 rounded-full text-sm font-medium transition hover:bg-primary-mid whitespace-nowrap"
            >
              {t(cta.secondary, lang)}
            </Link>
          </div>

          {/* Mobile: lang toggle + hamburger */}
          <div className="md:hidden flex items-center gap-3">
            <LangToggle />
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-1.5 p-2"
              aria-label="メニュー"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="block h-0.5 w-6 bg-heading" />
              <span className="block h-0.5 w-6 bg-heading" />
              <span className="block h-0.5 w-6 bg-heading" />
            </button>
          </div>
        </div>

        {/* Tier 2 — navigation tabs */}
        <div className="hidden md:block border-t border-border/70">
          <ul
            className={`max-w-6xl mx-auto px-6 flex items-center gap-2 ${MOTION} ${
              condensed ? "h-11" : "h-12"
            }`}
          >
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-full px-4 py-1.5 text-sm transition ${HIT_AREA} ${
                      active
                        ? "bg-primary-light font-medium text-primary"
                        : "text-body hover:bg-primary-light/60 hover:text-primary"
                    }`}
                  >
                    {t(item.label, lang)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-border bg-surface">
            <ul className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-4">
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
                  className="inline-flex min-h-11 items-center bg-primary text-white px-6 py-2.5 rounded-full text-sm font-medium transition hover:bg-primary-mid"
                >
                  {t(cta.secondary, lang)}
                </Link>
              </li>
              <li className="border-t border-border pt-4">
                <PhoneBlock lang={lang} align="start" />
              </li>
            </ul>
          </div>
        )}
        </div>
      </header>
    </>
  );
}
