"use client";

import Image from "next/image";
import Link from "next/link";
import { IconArrowRight, IconMapPin } from "@tabler/icons-react";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { isSafeExternalHref, safeLocalizedHref } from "./HomeLinks";

export function HomeHeroSection({
  content,
  lang,
}: {
  content: HomeContent["hero"];
  lang: Lang;
}) {
  const external = isSafeExternalHref(content.ctaPrimaryHref);
  const href = safeLocalizedHref(content.ctaPrimaryHref, lang);

  const cta = (
    <>
      {t(content.ctaPrimary, lang)}
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"
      >
        <ArrowRightIcon className="h-4 w-4" />
      </span>
    </>
  );

  return (
    <section className="relative isolate overflow-hidden" data-hero>
      <div className="absolute inset-0 -z-20">
        <Image
          src={content.image}
          alt={t(content.imageAlt, lang)}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-[74%_48%] md:object-[70%_46%]"
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(40%_40%_at_92%_8%,var(--color-accent-light)_0%,transparent_70%)] opacity-20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-bg/60 via-bg/20 to-transparent md:from-bg/45 md:via-bg/10"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-12 bg-linear-to-b from-transparent to-bg md:h-16"
      />

      <div className="relative mx-auto flex min-h-[30rem] max-w-6xl flex-col justify-center px-6 py-16 pb-24 md:min-h-[40rem] md:py-20 md:pb-28 lg:min-h-[44rem]">
        <div className="max-w-xl animate-fade-up">
          <h1 className="whitespace-pre-line text-4xl font-bold leading-tight text-heading md:text-5xl">
            {t(content.heading, lang)}
          </h1>

          <div className="mt-8 flex flex-col items-start gap-4">
            {external ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-full bg-accent px-7 py-3.5 font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90"
              >
                {cta}
              </a>
            ) : (
              <Link
                href={href}
                className="inline-flex items-center gap-3 rounded-full bg-accent px-7 py-3.5 font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90"
              >
                {cta}
              </Link>
            )}

            <div className="flex max-w-full flex-col items-start gap-1.5">
              <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-border bg-surface/90 px-4 py-2.5 shadow-sm backdrop-blur-sm">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary"
                  aria-hidden="true"
                >
                  <IconMapPin className="h-4 w-4" stroke={1.8} aria-hidden="true" />
                </span>
                <p className="break-keep text-sm font-semibold text-heading">
                  {t(content.areaBadge.main, lang)}
                </p>
              </div>
              <p className="px-1 text-xs leading-relaxed text-body md:text-sm">
                {t(content.areaBadge.sub, lang)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PyramidStatement({
  badge,
  resolve,
}: {
  badge: string;
  resolve: string;
}) {
  return (
    <div className="relative w-full max-w-sm animate-fade-up">
      <svg viewBox="0 0 600 500" className="block h-auto w-full md:hidden" aria-hidden="true">
        <path
          d="M24 24 H576 L300 476 Z"
          fill="var(--color-accent)"
          stroke="var(--color-accent)"
          strokeWidth="36"
          strokeLinejoin="round"
        />
      </svg>
      <svg viewBox="0 0 800 380" className="hidden h-auto w-full md:block" aria-hidden="true">
        <path
          d="M24 24 H776 L400 356 Z"
          fill="var(--color-accent)"
          stroke="var(--color-accent)"
          strokeWidth="36"
          strokeLinejoin="round"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-[10%] pb-[18%] pt-5 text-center text-white">
        <p className="text-xs font-medium tracking-wide text-white/90 md:text-sm">{badge}</p>
        <p className="mt-1.5 max-w-[56%] text-md font-bold leading-snug md:mt-2 md:max-w-[62%] md:text-lg">
          {resolve}
        </p>
      </div>
    </div>
  );
}

function ArrowRightIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <IconArrowRight className={className} stroke={2.5} aria-hidden="true" />;
}
