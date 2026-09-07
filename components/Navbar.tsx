"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { t, localizeHref, type Lang } from "@/features/lang/i18n";
import type { SiteContent } from "@/features/cms/site";
import { LOGO_INTRINSIC_HEIGHT, LOGO_INTRINSIC_WIDTH } from "./Footer";

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
 * SP bar shortcuts (0907 item 3): pick CMS nav items whose href matches these
 * slots. Labels come from Atlas (short seed labels「サービス」「料金」) — never
 * hardcoded in JSX. Home is intentionally absent from the bar.
 */
const SP_SHORTCUT_HREFS = ["/#service-details", "/pricing"] as const;

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

/**
 * Tracks which in-page section (if any) currently sits in the "active" band
 * of the viewport, so the tier-2 nav can highlight `/#service-details` while
 * scrolling — not just on exact-pathname matches.
 *
 * The rootMargin trims the observed viewport to a band just below the sticky
 * header, so a section is only "active" once it has actually reached reading
 * position, not the instant its bottom edge appears.
 */
function useActiveSection(ids: string[], pathname: string) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === "undefined") return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const intersecting = new Map<string, DOMRectReadOnly>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            intersecting.set(entry.target.id, entry.boundingClientRect);
          } else {
            intersecting.delete(entry.target.id);
          }
        }
        let topId: string | null = null;
        let topY = Infinity;
        for (const [id, rect] of intersecting) {
          if (rect.top < topY) {
            topY = rect.top;
            topId = id;
          }
        }
        setActiveId(topId);
      },
      { rootMargin: "-140px 0px -200px 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids, pathname]);

  return activeId;
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
  contactPhone,
  align = "end",
  condensed = false,
}: {
  lang: Lang;
  contactPhone: SiteContent["contactPhone"];
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

function PrimaryCtaLink({
  lang,
  label,
  primaryHref,
  className,
  onClick,
}: {
  lang: Lang;
  label: SiteContent["cta"]["primary"];
  primaryHref: SiteContent["cta"]["primaryHref"];
  className: string;
  onClick?: () => void;
}) {
  const external =
    primaryHref.startsWith("http://") || primaryHref.startsWith("https://");
  const text = t(label, lang);

  if (external) {
    return (
      <a
        href={localizeHref(primaryHref, lang)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {text}
      </a>
    );
  }

  return (
    <Link
      href={localizeHref(primaryHref, lang)}
      className={className}
      onClick={onClick}
    >
      {text}
    </Link>
  );
}

export default function Navbar({ lang, site }: { lang: Lang; site: SiteContent }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { sentinelRef, condensed } = useCondensedOnScroll();
  // In-page hash targets from `site.nav` (e.g. "service-details"). Memoized
  // on `site.nav` — the array reference from the server-fetched `site` prop
  // is stable across client re-renders caused by `open`/`condensed` state
  // changes, so this stays referentially stable too and never causes
  // useActiveSection's effect (dep `ids`, below) to tear down and rebuild
  // its IntersectionObserver on every render.
  const sectionIds = useMemo(
    () =>
      site.nav
        .map((item) => item.href.split("#")[1])
        .filter((id): id is string => Boolean(id)),
    [site.nav],
  );
  const activeSectionId = useActiveSection(sectionIds, pathname);
  const homeHref = localizeHref("/", lang);
  const activeHref =
    pathname === homeHref && activeSectionId
      ? `${homeHref}#${activeSectionId}`
      : pathname;

  // SP bar shortcuts from CMS nav by href slot (order = SP_SHORTCUT_HREFS).
  const spShortcuts = useMemo(
    () =>
      SP_SHORTCUT_HREFS.map((href) => site.nav.find((item) => item.href === href)).filter(
        (item): item is SiteContent["nav"][number] => Boolean(item),
      ),
    [site.nav],
  );

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
              ? "bg-surface/65 shadow-[0_2px_12px_rgba(27,31,94,0.07)]"
              : "bg-surface/45 shadow-none"
          }`}
        >
        {/* Tier 1 — brand, contact, actions.
            SP (md:hidden): Logo | サービス | 料金 | ☰ (0907 item 3). */}
        <div
          className={`max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 ${MOTION} ${
            condensed ? "h-14" : "h-20"
          }`}
        >
          <Link
            href={homeHref}
            className="flex items-center shrink-0"
            aria-label={t(site.brand.logoAlt, lang)}
            onClick={() => setOpen(false)}
          >
            <Image
              src={site.brand.logo}
              alt={t(site.brand.logoAlt, lang)}
              width={LOGO_INTRINSIC_WIDTH}
              height={LOGO_INTRINSIC_HEIGHT}
              priority
              className={`h-auto w-28 sm:w-36 origin-left ${MOTION} ${
                condensed ? "scale-[0.78]" : "scale-100"
              }`}
            />
          </Link>

          {/* Desktop: phone only in tier 1 (nav tabs are tier 2). */}
          <div className="hidden md:flex items-center gap-6">
            <PhoneBlock lang={lang} contactPhone={site.contactPhone} condensed={condensed} />
          </div>

          {/* Mobile: SP shortcuts + hamburger */}
          <div className="md:hidden flex items-center gap-1 sm:gap-2">
            <nav>
              <ul className="flex items-center gap-1">
                {spShortcuts.map((item) => {
                  const href = localizeHref(item.href, lang);
                  const active = href === activeHref;
                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-full px-2.5 py-1.5 text-sm font-medium transition ${HIT_AREA} ${
                          active
                            ? "bg-primary-light text-primary"
                            : "text-heading hover:bg-primary-light/60 hover:text-primary"
                        }`}
                      >
                        {t(item.label, lang)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-1.5 p-2"
              aria-label={t(site.ui.menuToggleLabel, lang)}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="block h-0.5 w-6 bg-heading" />
              <span className="block h-0.5 w-6 bg-heading" />
              <span className="block h-0.5 w-6 bg-heading" />
            </button>
          </div>
        </div>

        {/* Tier 2 — navigation tabs (desktop) */}
        <div className="hidden md:block border-t border-border/70">
          <nav>
            <ul
              className={`max-w-6xl mx-auto px-6 flex items-center gap-2 ${MOTION} ${
                condensed ? "h-11" : "h-12"
              }`}
            >
              {site.nav.map((item) => {
                const href = localizeHref(item.href, lang);
                const active = href === activeHref;
                return (
                  <li key={item.href}>
                    <Link
                      href={href}
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
          </nav>
        </div>

        {/* Mobile hamburger sheet — full CMS nav + phone + primary CTA */}
        {open && (
          <div className="md:hidden border-t border-border bg-surface">
            <nav>
              <ul className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-4">
                {site.nav.map((item) => {
                  const href = localizeHref(item.href, lang);
                  const active = href === activeHref;
                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
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
                <li className="border-t border-border pt-4">
                  <PhoneBlock lang={lang} contactPhone={site.contactPhone} align="start" />
                </li>
                {/* 0907 item 4 sheet side-note: same primary CTA as sticky bar */}
                <li className="pt-2">
                  <PrimaryCtaLink
                    lang={lang}
                    label={site.cta.primary}
                    primaryHref={site.cta.primaryHref}
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-bold text-white transition hover:bg-primary-mid"
                  />
                </li>
              </ul>
            </nav>
          </div>
        )}
        </div>
      </header>
    </>
  );
}
