"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconFileDescription,
  IconHeadset,
  IconPhone,
} from "@tabler/icons-react";
import { localizeHref, t, type Lang } from "@/features/lang/i18n";
import {
  useSiteContactPhone,
  useSitePrimaryCtaHref,
  useSiteStickyPhoneLabel,
  useSiteStickyRequestLabel,
} from "./site-cta-provider";

/** Persistent consultation CTA rail for both mobile and desktop. */
export default function StickyCta({ lang }: { lang: Lang }) {
  const href = useSitePrimaryCtaHref();
  const contactPhone = useSiteContactPhone();
  const contactLabel = useSiteStickyRequestLabel();
  const phoneLabel = useSiteStickyPhoneLabel();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target =
      document.querySelector("[data-first-view]") ??
      document.querySelector("[data-sticky-cta-sentinel]");
    if (!target) return;

    const updateVisibility = () => {
      setVisible(target.getBoundingClientRect().bottom <= 0);
    };

    updateVisibility();

    if (typeof IntersectionObserver === "undefined") {
      window.addEventListener("scroll", updateVisibility, { passive: true });
      window.addEventListener("resize", updateVisibility);
      return () => {
        window.removeEventListener("scroll", updateVisibility);
        window.removeEventListener("resize", updateVisibility);
      };
    }

    const observer = new IntersectionObserver(updateVisibility, { threshold: 0 });
    observer.observe(target);
    window.addEventListener("resize", updateVisibility);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 md:h-20"
      />
      <aside
        data-sticky-cta
        aria-hidden={!visible}
        inert={!visible}
        className={`fixed inset-x-0 bottom-0 z-[70] border-t border-white/20 bg-primary-deep pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_-14px_rgba(27,31,94,0.55)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
          visible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        }`}
      >
        <div className="grid w-full grid-cols-2 md:grid-cols-[0.85fr_1fr_0.85fr]">
          <div className="hidden min-h-20 items-center gap-3 border-r border-white/20 bg-primary-deep px-6 text-white md:flex">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <IconHeadset
                className="h-5 w-5"
                stroke={1.9}
                aria-hidden="true"
              />
            </span>
            <span className="text-sm font-semibold leading-relaxed">
              {t(contactPhone.note, lang)}
            </span>
          </div>
          <a
            href={`tel:${contactPhone.tel}`}
            aria-label={`${t(phoneLabel, lang)} ${contactPhone.display}`}
            className="group inline-flex min-h-16 items-center justify-center gap-2 border-r border-white/20 bg-primary-deep px-3 py-2 text-center text-sm font-bold text-white transition-colors duration-200 hover:bg-primary focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white motion-reduce:transition-none md:relative md:min-h-20 md:gap-4 md:border-r-0 md:border-l md:border-white/25 md:px-8 md:text-base md:shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
          >
            <IconPhone
              className="h-5 w-5 shrink-0 md:h-10 md:w-10 md:rounded-full md:border md:border-white/35 md:bg-white/10 md:p-2"
              stroke={1.9}
              aria-hidden="true"
            />
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="text-[0.68rem] font-medium text-white/80 sm:text-xs">
                {t(phoneLabel, lang)}
              </span>
              <span className="whitespace-nowrap tabular-nums tracking-[0.06em]">
                {contactPhone.display}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/10 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none md:flex"
            >
              <IconArrowRight className="h-4 w-4" stroke={2.25} />
            </span>
          </a>
          <Link
            href={localizeHref(href, lang)}
            className="group inline-flex min-h-16 items-center justify-center gap-2 bg-accent-deep px-3 py-2 text-center text-sm font-bold text-white transition-colors duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white motion-reduce:transition-none md:relative md:min-h-20 md:gap-4 md:border-l md:border-white/25 md:px-8 md:text-base md:shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
          >
            <IconFileDescription
              className="h-5 w-5 shrink-0 md:h-10 md:w-10 md:rounded-full md:border md:border-white/35 md:bg-white/10 md:p-2"
              stroke={1.9}
              aria-hidden="true"
            />
            <span>{t(contactLabel, lang)}</span>
            <span
              aria-hidden="true"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/10 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none md:flex"
            >
              <IconArrowRight className="h-4 w-4" stroke={2.25} />
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
