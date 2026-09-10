"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { localizeHref, t, type Lang } from "@/features/lang/i18n";
import { useSitePrimaryCta, useSitePrimaryCtaHref } from "./site-cta-provider";

/**
 * Floating conversion bar. Hidden while the first-view (or a short
 * non-home sentinel) is still on screen; then sticks to the bottom of the
 * viewport on both mobile and desktop.
 */
export default function StickyCta({ lang }: { lang: Lang }) {
  const label = useSitePrimaryCta();
  const href = useSitePrimaryCtaHref();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const firstView = document.querySelector("[data-first-view]");
    const sentinel = document.querySelector("[data-sticky-cta-sentinel]");
    const target = firstView ?? sentinel;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const localized = localizeHref(href, lang);

  return (
    <>
      <div
        aria-hidden="true"
        className={`shrink-0 ${visible ? "h-20" : "h-0"}`}
      />
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 transition duration-200 ${
            visible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-full opacity-0"
          }`}
      >
        <div
          className={`mx-auto flex max-w-6xl justify-center ${
            visible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <Link
            href={localized}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-bold text-white shadow-[0_8px_24px_-8px_rgba(43,126,193,0.55)] transition hover:bg-primary-mid md:w-auto md:min-w-72"
          >
            {t(label, lang)}
          </Link>
        </div>
      </div>
    </>
  );
}
