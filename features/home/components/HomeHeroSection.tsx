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
    <section
      className="relative isolate w-full overflow-hidden bg-bg xl:aspect-2/1 xl:min-h-[48rem] 2xl:min-h-[56rem]"
      data-hero
    >
      <div
        className="relative mx-4 mt-3 aspect-video overflow-hidden rounded-[1.5rem_1.5rem_4.5rem_1.5rem] shadow-[0_18px_50px_-32px_rgba(27,31,94,0.5)] md:absolute md:inset-0 md:m-0 md:-z-20 md:aspect-auto md:rounded-none md:shadow-none"
        data-hero-media
      >
        <Image
          src={content.image}
          alt={t(content.imageAlt, lang)}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-[58%_42%] md:object-[58%_center]"
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hidden bg-[radial-gradient(40%_40%_at_92%_8%,var(--color-accent-light)_0%,transparent_70%)] opacity-20 md:block"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hidden bg-linear-to-r from-bg/95 via-bg/75 to-transparent md:block md:from-bg/45 md:via-bg/10"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 hidden h-12 bg-linear-to-b from-transparent to-bg md:block md:h-16"
      />

      <div
        className="relative mx-auto flex max-w-6xl flex-col px-6 pb-7 pt-7 md:h-full md:min-h-[36rem] md:justify-center md:py-20 md:pb-28 lg:min-h-[42rem] xl:min-h-[48rem] 2xl:min-h-[min(70vh,56rem)]"
        data-hero-copy
      >
        <div className="max-w-[20rem] animate-fade-up sm:max-w-xl">
          <span
            aria-hidden="true"
            className="mb-4 block h-1 w-10 rounded-full bg-primary md:hidden"
            data-hero-accent
          />
          <h1 className="whitespace-pre-line text-[2rem] font-bold leading-[1.32] tracking-[-0.035em] text-heading sm:text-4xl md:text-5xl md:leading-tight md:tracking-normal">
            {t(content.heading, lang)}
          </h1>

          <div className="mt-5 flex flex-col items-start gap-5 md:mt-8 md:gap-4">
            <div
              className="order-1 flex w-full max-w-sm flex-col items-start gap-1.5 border-l-2 border-primary pl-4 md:order-2 md:border-l-0 md:pl-0"
              data-hero-area
            >
              <div className="inline-flex max-w-full items-center gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary md:h-8 md:w-8 md:bg-surface/90"
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

            {external ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="order-2 inline-flex w-full min-h-14 justify-between rounded-2xl bg-accent-deep px-5 py-3 font-medium text-white shadow-[0_12px_24px_-14px_rgba(181,58,103,0.7)] transition-[background-color,box-shadow,opacity] duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent motion-reduce:transition-none md:order-1 md:w-auto md:min-h-0 md:justify-start md:gap-3 md:rounded-full md:bg-accent md:px-7 md:py-3.5 md:shadow-lg md:shadow-accent/25 md:hover:opacity-90"
                data-hero-cta
              >
                {cta}
              </a>
            ) : (
              <Link
                href={href}
                className="order-2 inline-flex w-full min-h-14 justify-between rounded-2xl bg-accent-deep px-5 py-3 font-medium text-white shadow-[0_12px_24px_-14px_rgba(181,58,103,0.7)] transition-[background-color,box-shadow,opacity] duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent motion-reduce:transition-none md:order-1 md:w-auto md:min-h-0 md:justify-start md:gap-3 md:rounded-full md:bg-accent md:px-7 md:py-3.5 md:shadow-lg md:shadow-accent/25 md:hover:opacity-90"
                data-hero-cta
              >
                {cta}
              </Link>
            )}
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
