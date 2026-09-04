"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { localizeHref, t, type Lang } from "@/features/lang/i18n";
import type { SiteContent } from "@/features/cms/site";

/**
 * Fixed bottom CTA shown after the visitor scrolls past the first viewport
 * (FV). Label and href come from `site.cta` (Atlas) — never hardcoded.
 *
 * Visibility is layout-only (IntersectionObserver on a top-of-document
 * sentinel). The same CMS values also power the hamburger-menu CTA in
 * Navbar (0907 item 4 sheet side-note).
 *
 * Mount this near the top of the document flow (before `<main>`) so the
 * absolute FV sentinel measures from the page top.
 */
export default function StickySiteCta({
  lang,
  label,
  primaryHref,
}: {
  lang: Lang;
  label: SiteContent["cta"]["primary"];
  primaryHref: SiteContent["cta"]["primaryHref"];
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const external =
    primaryHref.startsWith("http://") || primaryHref.startsWith("https://");
  const text = t(label, lang);

  const className =
    "inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-mid";

  return (
    <>
      {/* Zero-flow sentinel spanning the first viewport; CTA appears once it
          leaves view. Must sit near document top (see AppShell order). */}
      <div aria-hidden="true" className="relative h-0">
        <div
          ref={sentinelRef}
          className="pointer-events-none absolute left-0 top-0 w-px"
          style={{ height: "100dvh" }}
        />
      </div>

      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 transition duration-200 motion-safe:ease-out ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
        aria-hidden={!visible}
      >
        {external ? (
          <a
            href={localizeHref(primaryHref, lang)}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={visible ? undefined : -1}
            className={`pointer-events-auto ${className} ${visible ? "" : "pointer-events-none"}`}
          >
            {text}
          </a>
        ) : (
          <Link
            href={localizeHref(primaryHref, lang)}
            tabIndex={visible ? undefined : -1}
            className={`pointer-events-auto ${className} ${visible ? "" : "pointer-events-none"}`}
          >
            {text}
          </Link>
        )}
      </div>
    </>
  );
}
